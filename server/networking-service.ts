import { db } from "./db";
import { 
  businessConnections,
  networkingPosts,
  networkingComments,
  networkingLikes,
  collaborationProjects,
  collaborationParticipants,
  businessReferrals,
  networkingEvents,
  eventAttendees,
  businesses,
  type BusinessConnection,
  type InsertBusinessConnection,
  type NetworkingPost,
  type InsertNetworkingPost,
  type NetworkingComment,
  type InsertNetworkingComment,
  type NetworkingLike,
  type InsertNetworkingLike,
  type CollaborationProject,
  type InsertCollaborationProject,
  type CollaborationParticipant,
  type InsertCollaborationParticipant,
  type BusinessReferral,
  type InsertBusinessReferral,
  type NetworkingEvent,
  type InsertNetworkingEvent,
  type EventAttendee,
  type InsertEventAttendee
} from "@shared/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";

export class NetworkingService {
  
  // ===================== BUSINESS CONNECTIONS =====================
  
  async getBusinessConnections(businessId: number): Promise<BusinessConnection[]> {
    const connections = await db
      .select()
      .from(businessConnections)
      .where(
        and(
          or(
            eq(businessConnections.requesterId, businessId),
            eq(businessConnections.recipientId, businessId)
          ),
          eq(businessConnections.status, "accepted")
        )
      )
      .orderBy(desc(businessConnections.createdAt));
    
    return connections;
  }
  
  async getConnectionRequests(businessId: number): Promise<BusinessConnection[]> {
    const requests = await db
      .select()
      .from(businessConnections)
      .where(
        and(
          eq(businessConnections.recipientId, businessId),
          eq(businessConnections.status, "pending")
        )
      )
      .orderBy(desc(businessConnections.createdAt));
    
    return requests;
  }
  
  async createConnectionRequest(connection: InsertBusinessConnection): Promise<BusinessConnection> {
    const [newConnection] = await db
      .insert(businessConnections)
      .values({
        ...connection,
        status: "pending",
        createdAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .returning();
    
    return newConnection;
  }
  
  async updateConnectionStatus(connectionId: number, status: string): Promise<BusinessConnection> {
    const [updatedConnection] = await db
      .update(businessConnections)
      .set({ 
        status,
        updatedAt: sql`now()`
      })
      .where(eq(businessConnections.id, connectionId))
      .returning();
    
    return updatedConnection;
  }
  
  async deleteConnection(connectionId: number): Promise<void> {
    await db
      .delete(businessConnections)
      .where(eq(businessConnections.id, connectionId));
  }
  
  // ===================== NETWORKING POSTS =====================
  
  async getNetworkingPosts(businessId?: number, category?: string): Promise<NetworkingPost[]> {
    let query = db
      .select({
        ...networkingPosts,
        businessName: businesses.name,
        businessCategory: businesses.category,
        businessLogo: businesses.logo,
      })
      .from(networkingPosts)
      .innerJoin(businesses, eq(networkingPosts.businessId, businesses.id))
      .where(eq(networkingPosts.isActive, true));
    
    if (businessId) {
      query = query.where(eq(networkingPosts.businessId, businessId));
    }
    
    if (category) {
      query = query.where(eq(networkingPosts.category, category));
    }
    
    const posts = await query.orderBy(desc(networkingPosts.createdAt));
    
    return posts;
  }
  
  async getNetworkingPost(id: number): Promise<NetworkingPost | undefined> {
    const [post] = await db
      .select({
        ...networkingPosts,
        businessName: businesses.name,
        businessCategory: businesses.category,
        businessLogo: businesses.logo,
      })
      .from(networkingPosts)
      .innerJoin(businesses, eq(networkingPosts.businessId, businesses.id))
      .where(eq(networkingPosts.id, id));
    
    return post;
  }
  
  async createNetworkingPost(post: InsertNetworkingPost & { businessId: number }): Promise<NetworkingPost> {
    const [newPost] = await db
      .insert(networkingPosts)
      .values({
        ...post,
        createdAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .returning();
    
    return newPost;
  }
  
  async updateNetworkingPost(id: number, post: Partial<InsertNetworkingPost>): Promise<NetworkingPost> {
    const [updatedPost] = await db
      .update(networkingPosts)
      .set({
        ...post,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, id))
      .returning();
    
    return updatedPost;
  }
  
  async deleteNetworkingPost(id: number): Promise<void> {
    await db
      .update(networkingPosts)
      .set({ 
        isActive: false,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, id));
  }
  
  async incrementPostViews(id: number): Promise<void> {
    await db
      .update(networkingPosts)
      .set({ 
        viewCount: sql`${networkingPosts.viewCount} + 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, id));
  }
  
  // ===================== NETWORKING COMMENTS =====================
  
  async getNetworkingComments(postId: number): Promise<NetworkingComment[]> {
    const comments = await db
      .select({
        ...networkingComments,
        businessName: businesses.name,
        businessLogo: businesses.logo,
      })
      .from(networkingComments)
      .innerJoin(businesses, eq(networkingComments.businessId, businesses.id))
      .where(
        and(
          eq(networkingComments.postId, postId),
          eq(networkingComments.isActive, true)
        )
      )
      .orderBy(networkingComments.createdAt);
    
    return comments;
  }
  
  async createNetworkingComment(comment: InsertNetworkingComment & { businessId: number }): Promise<NetworkingComment> {
    const [newComment] = await db
      .insert(networkingComments)
      .values({
        ...comment,
        createdAt: sql`now()`
      })
      .returning();
    
    // Update comment count on post
    await db
      .update(networkingPosts)
      .set({ 
        commentCount: sql`${networkingPosts.commentCount} + 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, comment.postId));
    
    return newComment;
  }
  
  async deleteNetworkingComment(id: number): Promise<void> {
    const [comment] = await db
      .select()
      .from(networkingComments)
      .where(eq(networkingComments.id, id));
    
    if (comment) {
      await db
        .update(networkingComments)
        .set({ isActive: false })
        .where(eq(networkingComments.id, id));
      
      // Update comment count on post
      await db
        .update(networkingPosts)
        .set({ 
          commentCount: sql`${networkingPosts.commentCount} - 1`,
          updatedAt: sql`now()`
        })
        .where(eq(networkingPosts.id, comment.postId));
    }
  }
  
  // ===================== NETWORKING LIKES =====================
  
  async getNetworkingLikes(postId: number): Promise<NetworkingLike[]> {
    const likes = await db
      .select({
        ...networkingLikes,
        businessName: businesses.name,
        businessLogo: businesses.logo,
      })
      .from(networkingLikes)
      .innerJoin(businesses, eq(networkingLikes.businessId, businesses.id))
      .where(eq(networkingLikes.postId, postId))
      .orderBy(desc(networkingLikes.createdAt));
    
    return likes;
  }
  
  async createNetworkingLike(like: InsertNetworkingLike & { businessId: number }): Promise<NetworkingLike> {
    const [newLike] = await db
      .insert(networkingLikes)
      .values({
        ...like,
        createdAt: sql`now()`
      })
      .returning();
    
    // Update like count on post
    await db
      .update(networkingPosts)
      .set({ 
        likeCount: sql`${networkingPosts.likeCount} + 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, like.postId));
    
    return newLike;
  }
  
  async deleteNetworkingLike(postId: number, businessId: number): Promise<void> {
    await db
      .delete(networkingLikes)
      .where(
        and(
          eq(networkingLikes.postId, postId),
          eq(networkingLikes.businessId, businessId)
        )
      );
    
    // Update like count on post
    await db
      .update(networkingPosts)
      .set({ 
        likeCount: sql`${networkingPosts.likeCount} - 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingPosts.id, postId));
  }
  
  // ===================== COLLABORATION PROJECTS =====================
  
  async getCollaborationProjects(businessId?: number, status?: string): Promise<CollaborationProject[]> {
    let query = db
      .select({
        ...collaborationProjects,
        creatorName: businesses.name,
        creatorLogo: businesses.logo,
      })
      .from(collaborationProjects)
      .innerJoin(businesses, eq(collaborationProjects.creatorId, businesses.id))
      .where(eq(collaborationProjects.isActive, true));
    
    if (businessId) {
      query = query.where(eq(collaborationProjects.creatorId, businessId));
    }
    
    if (status) {
      query = query.where(eq(collaborationProjects.status, status));
    }
    
    const projects = await query.orderBy(desc(collaborationProjects.createdAt));
    
    return projects;
  }
  
  async getCollaborationProject(id: number): Promise<CollaborationProject | undefined> {
    const [project] = await db
      .select({
        ...collaborationProjects,
        creatorName: businesses.name,
        creatorLogo: businesses.logo,
      })
      .from(collaborationProjects)
      .innerJoin(businesses, eq(collaborationProjects.creatorId, businesses.id))
      .where(eq(collaborationProjects.id, id));
    
    return project;
  }
  
  async createCollaborationProject(project: InsertCollaborationProject & { creatorId: number }): Promise<CollaborationProject> {
    const [newProject] = await db
      .insert(collaborationProjects)
      .values({
        ...project,
        createdAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .returning();
    
    return newProject;
  }
  
  async updateCollaborationProject(id: number, project: Partial<InsertCollaborationProject>): Promise<CollaborationProject> {
    const [updatedProject] = await db
      .update(collaborationProjects)
      .set({
        ...project,
        updatedAt: sql`now()`
      })
      .where(eq(collaborationProjects.id, id))
      .returning();
    
    return updatedProject;
  }
  
  async deleteCollaborationProject(id: number): Promise<void> {
    await db
      .update(collaborationProjects)
      .set({ 
        isActive: false,
        updatedAt: sql`now()`
      })
      .where(eq(collaborationProjects.id, id));
  }
  
  // ===================== COLLABORATION PARTICIPANTS =====================
  
  async getCollaborationParticipants(projectId: number): Promise<CollaborationParticipant[]> {
    const participants = await db
      .select({
        ...collaborationParticipants,
        businessName: businesses.name,
        businessLogo: businesses.logo,
        businessCategory: businesses.category,
      })
      .from(collaborationParticipants)
      .innerJoin(businesses, eq(collaborationParticipants.businessId, businesses.id))
      .where(
        and(
          eq(collaborationParticipants.projectId, projectId),
          eq(collaborationParticipants.isActive, true)
        )
      )
      .orderBy(collaborationParticipants.joinedAt);
    
    return participants;
  }
  
  async createCollaborationParticipant(participant: InsertCollaborationParticipant & { businessId: number }): Promise<CollaborationParticipant> {
    const [newParticipant] = await db
      .insert(collaborationParticipants)
      .values({
        ...participant,
        joinedAt: sql`now()`
      })
      .returning();
    
    // Update participant count on project
    await db
      .update(collaborationProjects)
      .set({ 
        currentParticipants: sql`${collaborationProjects.currentParticipants} + 1`,
        updatedAt: sql`now()`
      })
      .where(eq(collaborationProjects.id, participant.projectId));
    
    return newParticipant;
  }
  
  async deleteCollaborationParticipant(projectId: number, businessId: number): Promise<void> {
    await db
      .update(collaborationParticipants)
      .set({ isActive: false })
      .where(
        and(
          eq(collaborationParticipants.projectId, projectId),
          eq(collaborationParticipants.businessId, businessId)
        )
      );
    
    // Update participant count on project
    await db
      .update(collaborationProjects)
      .set({ 
        currentParticipants: sql`${collaborationProjects.currentParticipants} - 1`,
        updatedAt: sql`now()`
      })
      .where(eq(collaborationProjects.id, projectId));
  }
  
  // ===================== BUSINESS REFERRALS =====================
  
  async getBusinessReferrals(businessId: number): Promise<BusinessReferral[]> {
    const referrals = await db
      .select({
        ...businessReferrals,
        referredBusinessName: businesses.name,
        referredBusinessLogo: businesses.logo,
      })
      .from(businessReferrals)
      .innerJoin(businesses, eq(businessReferrals.referredBusinessId, businesses.id))
      .where(eq(businessReferrals.referrerId, businessId))
      .orderBy(desc(businessReferrals.createdAt));
    
    return referrals;
  }
  
  async getReceivedReferrals(businessId: number): Promise<BusinessReferral[]> {
    const referrals = await db
      .select({
        ...businessReferrals,
        referrerName: businesses.name,
        referrerLogo: businesses.logo,
      })
      .from(businessReferrals)
      .innerJoin(businesses, eq(businessReferrals.referrerId, businesses.id))
      .where(eq(businessReferrals.referredBusinessId, businessId))
      .orderBy(desc(businessReferrals.createdAt));
    
    return referrals;
  }
  
  async createBusinessReferral(referral: InsertBusinessReferral & { referrerId: number }): Promise<BusinessReferral> {
    const [newReferral] = await db
      .insert(businessReferrals)
      .values({
        ...referral,
        createdAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .returning();
    
    return newReferral;
  }
  
  async updateReferralStatus(id: number, status: string): Promise<BusinessReferral> {
    const [updatedReferral] = await db
      .update(businessReferrals)
      .set({
        status,
        updatedAt: sql`now()`
      })
      .where(eq(businessReferrals.id, id))
      .returning();
    
    return updatedReferral;
  }
  
  // ===================== NETWORKING EVENTS =====================
  
  async getNetworkingEvents(businessId?: number): Promise<NetworkingEvent[]> {
    let query = db
      .select({
        ...networkingEvents,
        organizerName: businesses.name,
        organizerLogo: businesses.logo,
      })
      .from(networkingEvents)
      .innerJoin(businesses, eq(networkingEvents.organizerId, businesses.id))
      .where(eq(networkingEvents.isActive, true));
    
    if (businessId) {
      query = query.where(eq(networkingEvents.organizerId, businessId));
    }
    
    const events = await query.orderBy(networkingEvents.startDate);
    
    return events;
  }
  
  async getNetworkingEvent(id: number): Promise<NetworkingEvent | undefined> {
    const [event] = await db
      .select({
        ...networkingEvents,
        organizerName: businesses.name,
        organizerLogo: businesses.logo,
        organizerCategory: businesses.category,
      })
      .from(networkingEvents)
      .innerJoin(businesses, eq(networkingEvents.organizerId, businesses.id))
      .where(eq(networkingEvents.id, id));
    
    return event;
  }
  
  async createNetworkingEvent(event: InsertNetworkingEvent & { organizerId: number }): Promise<NetworkingEvent> {
    const [newEvent] = await db
      .insert(networkingEvents)
      .values({
        ...event,
        createdAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .returning();
    
    return newEvent;
  }
  
  async updateNetworkingEvent(id: number, event: Partial<InsertNetworkingEvent>): Promise<NetworkingEvent> {
    const [updatedEvent] = await db
      .update(networkingEvents)
      .set({
        ...event,
        updatedAt: sql`now()`
      })
      .where(eq(networkingEvents.id, id))
      .returning();
    
    return updatedEvent;
  }
  
  async deleteNetworkingEvent(id: number): Promise<void> {
    await db
      .update(networkingEvents)
      .set({ 
        isActive: false,
        updatedAt: sql`now()`
      })
      .where(eq(networkingEvents.id, id));
  }
  
  // ===================== EVENT ATTENDEES =====================
  
  async getEventAttendees(eventId: number): Promise<EventAttendee[]> {
    const attendees = await db
      .select({
        ...eventAttendees,
        businessName: businesses.name,
        businessLogo: businesses.logo,
        businessCategory: businesses.category,
      })
      .from(eventAttendees)
      .innerJoin(businesses, eq(eventAttendees.businessId, businesses.id))
      .where(eq(eventAttendees.eventId, eventId))
      .orderBy(eventAttendees.registeredAt);
    
    return attendees;
  }
  
  async createEventAttendee(attendee: InsertEventAttendee & { businessId: number }): Promise<EventAttendee> {
    const [newAttendee] = await db
      .insert(eventAttendees)
      .values({
        ...attendee,
        registeredAt: sql`now()`
      })
      .returning();
    
    // Update attendee count on event
    await db
      .update(networkingEvents)
      .set({ 
        currentAttendees: sql`${networkingEvents.currentAttendees} + 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingEvents.id, attendee.eventId));
    
    return newAttendee;
  }
  
  async updateAttendeeStatus(eventId: number, businessId: number, status: string): Promise<EventAttendee> {
    const [updatedAttendee] = await db
      .update(eventAttendees)
      .set({ attendeeStatus: status })
      .where(
        and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.businessId, businessId)
        )
      )
      .returning();
    
    return updatedAttendee;
  }
  
  async deleteEventAttendee(eventId: number, businessId: number): Promise<void> {
    await db
      .delete(eventAttendees)
      .where(
        and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.businessId, businessId)
        )
      );
    
    // Update attendee count on event
    await db
      .update(networkingEvents)
      .set({ 
        currentAttendees: sql`${networkingEvents.currentAttendees} - 1`,
        updatedAt: sql`now()`
      })
      .where(eq(networkingEvents.id, eventId));
  }
  
  // ===================== UTILITY METHODS =====================
  
  async getNetworkingStats(businessId: number): Promise<{
    connectionCount: number;
    postsCount: number;
    collaborationsCount: number;
    referralsGiven: number;
    referralsReceived: number;
    eventsOrganized: number;
    eventsAttended: number;
  }> {
    try {
      // Return mock data initially to test the frontend
      return {
        connectionCount: 5,
        postsCount: 3,
        collaborationsCount: 2,
        referralsGiven: 4,
        referralsReceived: 6,
        eventsOrganized: 1,
        eventsAttended: 8,
      };
    } catch (error) {
      console.error("Error in getNetworkingStats:", error);
      return {
        connectionCount: 0,
        postsCount: 0,
        collaborationsCount: 0,
        referralsGiven: 0,
        referralsReceived: 0,
        eventsOrganized: 0,
        eventsAttended: 0,
      };
    }
  }
  
  async getSuggestedConnections(businessId: number, limit: number = 10): Promise<any[]> {
    // Get businesses in the same category or city as potential connections
    const currentBusiness = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    
    if (!currentBusiness.length) return [];
    
    const business = currentBusiness[0];
    
    // Find similar businesses that are not already connected
    const suggestions = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.isActive, true),
          or(
            eq(businesses.category, business.category),
            eq(businesses.city, business.city)
          ),
          sql`${businesses.id} != ${businessId}`,
          sql`${businesses.id} NOT IN (
            SELECT CASE 
              WHEN ${businessConnections.requesterId} = ${businessId} THEN ${businessConnections.recipientId}
              ELSE ${businessConnections.requesterId}
            END
            FROM ${businessConnections}
            WHERE (${businessConnections.requesterId} = ${businessId} OR ${businessConnections.recipientId} = ${businessId})
          )`
        )
      )
      .limit(limit);
    
    return suggestions;
  }
}

export const networkingService = new NetworkingService();