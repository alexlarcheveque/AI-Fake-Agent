import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "./BaseRepository";
import {
  Lead,
  LeadRow,
  LeadInsert,
  LeadUpdate,
  LeadUtils,
} from "../models/Lead";

/**
 * Repository for working with leads in the database
 */
export class LeadRepository extends BaseRepository<
  LeadRow,
  LeadInsert,
  LeadUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, "leads");
  }

  /**
   * Get leads by user ID
   */
  async getByUserId(userId: string): Promise<Lead[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("user_uuid", userId);

    if (error) throw new Error(error.message);

    // Transform database rows to model objects
    return data.map((lead) => LeadUtils.toModel(lead));
  }

  /**
   * Get active leads by user ID
   */
  async getActiveByUserId(userId: string): Promise<Lead[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("*")
      .eq("user_uuid", userId)
      .eq("is_archived", false);

    if (error) throw new Error(error.message);

    // Transform database rows to model objects
    return data.map((lead) => LeadUtils.toModel(lead));
  }

  /**
   * Archive a lead
   */
  async archiveLead(id: number | string): Promise<Lead> {
    const { data, error } = await this.supabase
      .from(this.table)
      .update({ is_archived: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return LeadUtils.toModel(data);
  }

  /**
   * Search leads with filtering
   */
  async searchLeads(
    userId: string,
    searchTerm: string = "",
    searchFields: string[] = ["name", "email", "phone_number"],
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ leads: Lead[]; totalCount: number; totalPages: number }> {
    let query = this.supabase
      .from(this.table)
      .select("*", { count: "exact" })
      .eq("user_uuid", userId);

    // Apply search if provided
    if (searchTerm && searchFields.length > 0) {
      // Create OR conditions for each search field
      const searchConditions = searchFields.map((field) => {
        return `${field}.ilike.%${searchTerm}%`;
      });

      // Apply the OR conditions
      query = query.or(searchConditions.join(","));
    }

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Apply pagination
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return {
      leads: data.map((lead) => LeadUtils.toModel(lead)),
      totalCount: count || 0,
      totalPages,
    };
  }
}
