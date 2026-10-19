import { Router } from "express";
import { networkingService } from "./networking-service";
import { requireAuth, type AuthenticatedRequest } from "./auth-middleware";
import { storage } from "./storage";
import { 
  insertBusinessConnectionSchema,
  insertNetworkingPostSchema,
  insertNetworkingCommentSchema,
  insertNetworkingLikeSchema,
  insertCollaborationProjectSchema,
  insertCollaborationParticipantSchema,
  insertBusinessReferralSchema,
  insertNetworkingEventSchema,
  insertEventAttendeeSchema
} from "@shared/schema";

const router = Router();

// Every networking endpoint requires a session…
router.use(requireAuth);

// …and every business referenced by the request must belong to that session.
// Previously these routes were fully anonymous, so anyone could post, like or
// delete content as any other business.
router.use(async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "No autorizado" });

    const businesses = await storage.getBusinessesByUserId(user.id);
    const ownedIds = new Set(businesses.map((business) => business.id));
    const body = (req.body ?? {}) as Record<string, unknown>;

    const candidates = [req.params.businessId, body.businessId, req.query.businessId, body.requesterId]
      .filter((value) => value !== undefined && value !== null && value !== "");

    for (const raw of candidates) {
      const id = Number(raw);
      if (Number.isFinite(id) && !ownedIds.has(id)) {
        return res.status(403).json({ error: "No tienes acceso a este negocio" });
      }
    }

    // Content created from the dashboard is always attributed to the caller.
    if (req.method !== "GET" && businesses.length > 0 && "requesterId" in body) {
      body.requesterId = businesses[0].id;
    }

    next();
  } catch (error: any) {
    console.error("Networking authorization failed:", error);
    res.status(500).json({ error: "Error de autorización" });
  }
});

// ===================== BUSINESS CONNECTIONS =====================

// Get business connections
router.get("/connections/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const connections = await networkingService.getBusinessConnections(businessId);
    res.json(connections);
  } catch (error: any) {
    console.error("Error fetching business connections:", error);
    res.status(500).json({ error: "Failed to fetch business connections" });
  }
});

// Get connection requests
router.get("/connections/:businessId/requests", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const requests = await networkingService.getConnectionRequests(businessId);
    res.json(requests);
  } catch (error: any) {
    console.error("Error fetching connection requests:", error);
    res.status(500).json({ error: "Failed to fetch connection requests" });
  }
});

// Create connection request
router.post("/connections", async (req, res) => {
  try {
    const connectionData = insertBusinessConnectionSchema.parse(req.body);
    const connection = await networkingService.createConnectionRequest(connectionData);
    res.json(connection);
  } catch (error: any) {
    console.error("Error creating connection request:", error);
    res.status(500).json({ error: "Failed to create connection request" });
  }
});

// Update connection status
router.patch("/connections/:id/status", async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    const { status } = req.body;
    const connection = await networkingService.updateConnectionStatus(connectionId, status);
    res.json(connection);
  } catch (error: any) {
    console.error("Error updating connection status:", error);
    res.status(500).json({ error: "Failed to update connection status" });
  }
});

// Delete connection
router.delete("/connections/:id", async (req, res) => {
  try {
    const connectionId = parseInt(req.params.id);
    await networkingService.deleteConnection(connectionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting connection:", error);
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

// ===================== NETWORKING POSTS =====================

// Get networking posts
router.get("/posts", async (req, res) => {
  try {
    const { businessId, category } = req.query;
    const posts = await networkingService.getNetworkingPosts(
      businessId ? parseInt(businessId as string) : undefined,
      category as string
    );
    res.json(posts);
  } catch (error: any) {
    console.error("Error fetching networking posts:", error);
    res.status(500).json({ error: "Failed to fetch networking posts" });
  }
});

// Get specific networking post
router.get("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await networkingService.getNetworkingPost(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    // Increment view count
    await networkingService.incrementPostViews(postId);
    
    res.json(post);
  } catch (error: any) {
    console.error("Error fetching networking post:", error);
    res.status(500).json({ error: "Failed to fetch networking post" });
  }
});

// Create networking post
router.post("/posts", async (req, res) => {
  try {
    const postData = insertNetworkingPostSchema.parse(req.body);
    const businessId = parseInt(req.body.businessId);
    const post = await networkingService.createNetworkingPost({ ...postData, businessId });
    res.json(post);
  } catch (error: any) {
    console.error("Error creating networking post:", error);
    res.status(500).json({ error: "Failed to create networking post" });
  }
});

// Update networking post
router.patch("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const postData = insertNetworkingPostSchema.partial().parse(req.body);
    const post = await networkingService.updateNetworkingPost(postId, postData);
    res.json(post);
  } catch (error: any) {
    console.error("Error updating networking post:", error);
    res.status(500).json({ error: "Failed to update networking post" });
  }
});

// Delete networking post
router.delete("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await networkingService.deleteNetworkingPost(postId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting networking post:", error);
    res.status(500).json({ error: "Failed to delete networking post" });
  }
});

// ===================== NETWORKING COMMENTS =====================

// Get post comments
router.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await networkingService.getNetworkingComments(postId);
    res.json(comments);
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Create comment
router.post("/posts/:id/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const commentData = insertNetworkingCommentSchema.parse(req.body);
    const businessId = parseInt(req.body.businessId);
    const comment = await networkingService.createNetworkingComment({
      ...commentData,
      postId,
      businessId
    });
    res.json(comment);
  } catch (error: any) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Delete comment
router.delete("/comments/:id", async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    await networkingService.deleteNetworkingComment(commentId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// ===================== NETWORKING LIKES =====================

// Get post likes
router.get("/posts/:id/likes", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const likes = await networkingService.getNetworkingLikes(postId);
    res.json(likes);
  } catch (error: any) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ error: "Failed to fetch likes" });
  }
});

// Create like
router.post("/posts/:id/likes", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const businessId = parseInt(req.body.businessId);
    const like = await networkingService.createNetworkingLike({ postId, businessId });
    res.json(like);
  } catch (error: any) {
    console.error("Error creating like:", error);
    res.status(500).json({ error: "Failed to create like" });
  }
});

// Delete like
router.delete("/posts/:postId/likes/:businessId", async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const businessId = parseInt(req.params.businessId);
    await networkingService.deleteNetworkingLike(postId, businessId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting like:", error);
    res.status(500).json({ error: "Failed to delete like" });
  }
});

// ===================== COLLABORATION PROJECTS =====================

// Get collaboration projects
router.get("/collaborations", async (req, res) => {
  try {
    const { businessId, status } = req.query;
    const projects = await networkingService.getCollaborationProjects(
      businessId ? parseInt(businessId as string) : undefined,
      status as string
    );
    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching collaboration projects:", error);
    res.status(500).json({ error: "Failed to fetch collaboration projects" });
  }
});

// Get specific collaboration project
router.get("/collaborations/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await networkingService.getCollaborationProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error: any) {
    console.error("Error fetching collaboration project:", error);
    res.status(500).json({ error: "Failed to fetch collaboration project" });
  }
});

// Create collaboration project
router.post("/collaborations", async (req, res) => {
  try {
    const projectData = insertCollaborationProjectSchema.parse(req.body);
    const creatorId = parseInt(req.body.creatorId);
    const project = await networkingService.createCollaborationProject({ ...projectData, creatorId });
    res.json(project);
  } catch (error: any) {
    console.error("Error creating collaboration project:", error);
    res.status(500).json({ error: "Failed to create collaboration project" });
  }
});

// Update collaboration project
router.patch("/collaborations/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const projectData = insertCollaborationProjectSchema.partial().parse(req.body);
    const project = await networkingService.updateCollaborationProject(projectId, projectData);
    res.json(project);
  } catch (error: any) {
    console.error("Error updating collaboration project:", error);
    res.status(500).json({ error: "Failed to update collaboration project" });
  }
});

// Delete collaboration project
router.delete("/collaborations/:id", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    await networkingService.deleteCollaborationProject(projectId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting collaboration project:", error);
    res.status(500).json({ error: "Failed to delete collaboration project" });
  }
});

// ===================== COLLABORATION PARTICIPANTS =====================

// Get project participants
router.get("/collaborations/:id/participants", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const participants = await networkingService.getCollaborationParticipants(projectId);
    res.json(participants);
  } catch (error: any) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

// Join collaboration project
router.post("/collaborations/:id/participants", async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const participantData = insertCollaborationParticipantSchema.parse(req.body);
    const businessId = parseInt(req.body.businessId);
    const participant = await networkingService.createCollaborationParticipant({
      ...participantData,
      projectId,
      businessId
    });
    res.json(participant);
  } catch (error: any) {
    console.error("Error joining collaboration project:", error);
    res.status(500).json({ error: "Failed to join collaboration project" });
  }
});

// Leave collaboration project
router.delete("/collaborations/:projectId/participants/:businessId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const businessId = parseInt(req.params.businessId);
    await networkingService.deleteCollaborationParticipant(projectId, businessId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error leaving collaboration project:", error);
    res.status(500).json({ error: "Failed to leave collaboration project" });
  }
});

// ===================== BUSINESS REFERRALS =====================

// Get referrals given by business
router.get("/referrals/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const referrals = await networkingService.getBusinessReferrals(businessId);
    res.json(referrals);
  } catch (error: any) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
});

// Get referrals received by business
router.get("/referrals/:businessId/received", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const referrals = await networkingService.getReceivedReferrals(businessId);
    res.json(referrals);
  } catch (error: any) {
    console.error("Error fetching received referrals:", error);
    res.status(500).json({ error: "Failed to fetch received referrals" });
  }
});

// Create referral
router.post("/referrals", async (req, res) => {
  try {
    const referralData = insertBusinessReferralSchema.parse(req.body);
    const referrerId = parseInt(req.body.referrerId);
    const referral = await networkingService.createBusinessReferral({ ...referralData, referrerId });
    res.json(referral);
  } catch (error: any) {
    console.error("Error creating referral:", error);
    res.status(500).json({ error: "Failed to create referral" });
  }
});

// Update referral status
router.patch("/referrals/:id/status", async (req, res) => {
  try {
    const referralId = parseInt(req.params.id);
    const { status } = req.body;
    const referral = await networkingService.updateReferralStatus(referralId, status);
    res.json(referral);
  } catch (error: any) {
    console.error("Error updating referral status:", error);
    res.status(500).json({ error: "Failed to update referral status" });
  }
});

// ===================== NETWORKING EVENTS =====================

// Get networking events
router.get("/events", async (req, res) => {
  try {
    const { businessId } = req.query;
    const events = await networkingService.getNetworkingEvents(
      businessId ? parseInt(businessId as string) : undefined
    );
    res.json(events);
  } catch (error: any) {
    console.error("Error fetching networking events:", error);
    res.status(500).json({ error: "Failed to fetch networking events" });
  }
});

// Get specific networking event
router.get("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await networkingService.getNetworkingEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error: any) {
    console.error("Error fetching networking event:", error);
    res.status(500).json({ error: "Failed to fetch networking event" });
  }
});

// Create networking event
router.post("/events", async (req, res) => {
  try {
    const eventData = insertNetworkingEventSchema.parse(req.body);
    const organizerId = parseInt(req.body.organizerId);
    const event = await networkingService.createNetworkingEvent({ ...eventData, organizerId });
    res.json(event);
  } catch (error: any) {
    console.error("Error creating networking event:", error);
    res.status(500).json({ error: "Failed to create networking event" });
  }
});

// Update networking event
router.patch("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const eventData = insertNetworkingEventSchema.partial().parse(req.body);
    const event = await networkingService.updateNetworkingEvent(eventId, eventData);
    res.json(event);
  } catch (error: any) {
    console.error("Error updating networking event:", error);
    res.status(500).json({ error: "Failed to update networking event" });
  }
});

// Delete networking event
router.delete("/events/:id", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    await networkingService.deleteNetworkingEvent(eventId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting networking event:", error);
    res.status(500).json({ error: "Failed to delete networking event" });
  }
});

// ===================== EVENT ATTENDEES =====================

// Get event attendees
router.get("/events/:id/attendees", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const attendees = await networkingService.getEventAttendees(eventId);
    res.json(attendees);
  } catch (error: any) {
    console.error("Error fetching event attendees:", error);
    res.status(500).json({ error: "Failed to fetch event attendees" });
  }
});

// Register for event
router.post("/events/:id/attendees", async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const attendeeData = insertEventAttendeeSchema.parse(req.body);
    const businessId = parseInt(req.body.businessId);
    const attendee = await networkingService.createEventAttendee({
      ...attendeeData,
      eventId,
      businessId
    });
    res.json(attendee);
  } catch (error: any) {
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Failed to register for event" });
  }
});

// Update attendee status
router.patch("/events/:eventId/attendees/:businessId", async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const businessId = parseInt(req.params.businessId);
    const { status } = req.body;
    const attendee = await networkingService.updateAttendeeStatus(eventId, businessId, status);
    res.json(attendee);
  } catch (error: any) {
    console.error("Error updating attendee status:", error);
    res.status(500).json({ error: "Failed to update attendee status" });
  }
});

// Unregister from event
router.delete("/events/:eventId/attendees/:businessId", async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const businessId = parseInt(req.params.businessId);
    await networkingService.deleteEventAttendee(eventId, businessId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error unregistering from event:", error);
    res.status(500).json({ error: "Failed to unregister from event" });
  }
});

// ===================== UTILITY ENDPOINTS =====================

// Get networking stats for a business
router.get("/stats/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const stats = await networkingService.getNetworkingStats(businessId);
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching networking stats:", error);
    res.status(500).json({ error: "Failed to fetch networking stats" });
  }
});

// Get suggested connections for a business
router.get("/suggestions/:businessId", async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const limit = parseInt(req.query.limit as string) || 10;
    const suggestions = await networkingService.getSuggestedConnections(businessId, limit);
    res.json(suggestions);
  } catch (error: any) {
    console.error("Error fetching suggested connections:", error);
    res.status(500).json({ error: "Failed to fetch suggested connections" });
  }
});

export default router;