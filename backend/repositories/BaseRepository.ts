import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Base repository class for Supabase database operations
 */
export class BaseRepository<T, TInsert, TUpdate> {
  protected supabase: SupabaseClient;
  protected table: string;

  constructor(supabase: SupabaseClient, table: string) {
    this.supabase = supabase;
    this.table = table;
  }

  /**
   * Get all records from the table
   */
  async getAll(): Promise<T[]> {
    const { data, error } = await this.supabase.from(this.table).select("*");

    if (error) throw new Error(error.message);
    return data as T[];
  }

  /**
   * Get a record by ID
   */
  async getById(id: number | string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // PGRST116 means no rows returned, return null instead of throwing error
        return null;
      }
      throw new Error(error.message);
    }

    return data as T;
  }

  /**
   * Get records by a specific field value
   */
  async getByField(field: string, value: any): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq(field, value);

    if (error) throw new Error(error.message);
    return data as T[];
  }

  /**
   * Create a new record
   */
  async create(record: TInsert): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.table)
      .insert(record)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  /**
   * Create multiple records
   */
  async createMany(records: TInsert[]): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .insert(records)
      .select();

    if (error) throw new Error(error.message);
    return data as T[];
  }

  /**
   * Update a record
   */
  async update(id: number | string, record: TUpdate): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.table)
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  /**
   * Delete a record
   */
  async delete(id: number | string): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  /**
   * Get records with pagination
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ data: T[]; count: number }> {
    // Get total count
    const { count, error: countError } = await this.supabase
      .from(this.table)
      .select("*", { count: "exact", head: true });

    if (countError) throw new Error(countError.message);

    // Calculate range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get paginated data
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      data: data as T[],
      count: count || 0,
    };
  }
}
