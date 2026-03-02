import { getServiceRoleClient } from "@/server/db/client";
import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  requestor_name: z.string().min(1, "Your name is required").max(100),
  department_id: z.string().uuid("Department is required"),
  location_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  job_type: z.enum(["reactive", "install"]).default("reactive"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export interface BootstrapData {
  departments: Array<{ id: string; name: string; sort_order: number }>;
  locations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export async function getBootstrapData(orgId: string): Promise<BootstrapData> {
  const supabase = getServiceRoleClient();

  const [departmentsResult, locationsResult, categoriesResult] =
    await Promise.all([
      supabase
        .from("departments")
        .select("id, name, sort_order")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("locations")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

  return {
    departments: departmentsResult.data || [],
    locations: locationsResult.data || [],
    categories: categoriesResult.data || [],
  };
}

export async function createJobFromRequestor(
  orgId: string,
  sessionId: string,
  input: CreateJobInput,
): Promise<{ jobId: string }> {
  const supabase = getServiceRoleClient();

  const validated = createJobSchema.parse(input);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      org_id: orgId,
      department_id: validated.department_id,
      location_id: validated.location_id || null,
      category_id: validated.category_id || null,
      title: validated.title,
      description: validated.description || null,
      requestor_name: validated.requestor_name,
      requestor_session_id: sessionId,
      status: "new",
      job_type: validated.job_type,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    throw new Error("Failed to create job", { cause: jobError });
  }

  const { error: eventError } = await supabase.from("job_events").insert({
    org_id: orgId,
    job_id: job.id,
    event_type: "created",
    actor_type: "requestor",
    actor_user_id: null,
    payload: {
      requestor_name: validated.requestor_name,
      department_id: validated.department_id,
      location_id: validated.location_id,
      category_id: validated.category_id,
      job_type: validated.job_type,
    },
  });

  if (eventError) {
    throw new Error("Failed to create job event", { cause: eventError });
  }

  return { jobId: job.id };
}

export interface RequestorTicket {
  id: string;
  title: string;
  description: string | null;
  status: "new" | "taken" | "completed";
  job_type: "reactive" | "install";
  created_at: string;
  department: { name: string } | null;
  location: { name: string } | null;
  category: { name: string } | null;
}

export async function getMyTickets(
  orgId: string,
  sessionId: string,
): Promise<RequestorTicket[]> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(
      `
      id,
      title,
      description,
      status,
      job_type,
      created_at,
      departments!inner(name),
      locations(name),
      categories(name)
    `,
    )
    .eq("org_id", orgId)
    .eq("requestor_session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch tickets", { cause: error });
  }

  type Row = {
    id: string;
    title: string;
    description: string | null;
    status: "new" | "taken" | "completed";
    job_type: "reactive" | "install";
    created_at: string;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  };

  const tickets = (data || []).map((item: Row) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    job_type: item.job_type,
    created_at: item.created_at,
    department: item.departments?.[0]
      ? { name: item.departments[0].name }
      : null,
    location: item.locations?.[0] ? { name: item.locations[0].name } : null,
    category: item.categories?.[0] ? { name: item.categories[0].name } : null,
  }));

  return tickets;
}
