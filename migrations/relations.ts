import { relations } from "drizzle-orm/relations";
import { businesses, businessSettings, appointments, clients, services, gallery, reviews, users, networkingPosts, networkingLikes, networkingComments, businessConnections, collaborationProjects, collaborationParticipants, businessReferrals, networkingEvents, eventAttendees } from "./schema";

export const businessSettingsRelations = relations(businessSettings, ({one}) => ({
	business: one(businesses, {
		fields: [businessSettings.businessId],
		references: [businesses.id]
	}),
}));

export const businessesRelations = relations(businesses, ({one, many}) => ({
	businessSettings: many(businessSettings),
	appointments: many(appointments),
	galleries: many(gallery),
	reviews: many(reviews),
	user: one(users, {
		fields: [businesses.userId],
		references: [users.id]
	}),
	clients: many(clients),
	services: many(services),
	networkingPosts: many(networkingPosts),
	networkingLikes: many(networkingLikes),
	networkingComments: many(networkingComments),
	businessConnections_requesterId: many(businessConnections, {
		relationName: "businessConnections_requesterId_businesses_id"
	}),
	businessConnections_recipientId: many(businessConnections, {
		relationName: "businessConnections_recipientId_businesses_id"
	}),
	collaborationProjects: many(collaborationProjects),
	collaborationParticipants: many(collaborationParticipants),
	businessReferrals_referrerId: many(businessReferrals, {
		relationName: "businessReferrals_referrerId_businesses_id"
	}),
	businessReferrals_referredBusinessId: many(businessReferrals, {
		relationName: "businessReferrals_referredBusinessId_businesses_id"
	}),
	networkingEvents: many(networkingEvents),
	eventAttendees: many(eventAttendees),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	business: one(businesses, {
		fields: [appointments.businessId],
		references: [businesses.id]
	}),
	client: one(clients, {
		fields: [appointments.clientId],
		references: [clients.id]
	}),
	service: one(services, {
		fields: [appointments.serviceId],
		references: [services.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	appointments: many(appointments),
	business: one(businesses, {
		fields: [clients.businessId],
		references: [businesses.id]
	}),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	appointments: many(appointments),
	business: one(businesses, {
		fields: [services.businessId],
		references: [businesses.id]
	}),
}));

export const galleryRelations = relations(gallery, ({one}) => ({
	business: one(businesses, {
		fields: [gallery.businessId],
		references: [businesses.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	business: one(businesses, {
		fields: [reviews.businessId],
		references: [businesses.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	businesses: many(businesses),
}));

export const networkingPostsRelations = relations(networkingPosts, ({one, many}) => ({
	business: one(businesses, {
		fields: [networkingPosts.businessId],
		references: [businesses.id]
	}),
	networkingLikes: many(networkingLikes),
	networkingComments: many(networkingComments),
}));

export const networkingLikesRelations = relations(networkingLikes, ({one}) => ({
	networkingPost: one(networkingPosts, {
		fields: [networkingLikes.postId],
		references: [networkingPosts.id]
	}),
	business: one(businesses, {
		fields: [networkingLikes.businessId],
		references: [businesses.id]
	}),
}));

export const networkingCommentsRelations = relations(networkingComments, ({one, many}) => ({
	networkingPost: one(networkingPosts, {
		fields: [networkingComments.postId],
		references: [networkingPosts.id]
	}),
	business: one(businesses, {
		fields: [networkingComments.businessId],
		references: [businesses.id]
	}),
	networkingComment: one(networkingComments, {
		fields: [networkingComments.parentId],
		references: [networkingComments.id],
		relationName: "networkingComments_parentId_networkingComments_id"
	}),
	networkingComments: many(networkingComments, {
		relationName: "networkingComments_parentId_networkingComments_id"
	}),
}));

export const businessConnectionsRelations = relations(businessConnections, ({one}) => ({
	business_requesterId: one(businesses, {
		fields: [businessConnections.requesterId],
		references: [businesses.id],
		relationName: "businessConnections_requesterId_businesses_id"
	}),
	business_recipientId: one(businesses, {
		fields: [businessConnections.recipientId],
		references: [businesses.id],
		relationName: "businessConnections_recipientId_businesses_id"
	}),
}));

export const collaborationProjectsRelations = relations(collaborationProjects, ({one, many}) => ({
	business: one(businesses, {
		fields: [collaborationProjects.creatorId],
		references: [businesses.id]
	}),
	collaborationParticipants: many(collaborationParticipants),
}));

export const collaborationParticipantsRelations = relations(collaborationParticipants, ({one}) => ({
	collaborationProject: one(collaborationProjects, {
		fields: [collaborationParticipants.projectId],
		references: [collaborationProjects.id]
	}),
	business: one(businesses, {
		fields: [collaborationParticipants.businessId],
		references: [businesses.id]
	}),
}));

export const businessReferralsRelations = relations(businessReferrals, ({one}) => ({
	business_referrerId: one(businesses, {
		fields: [businessReferrals.referrerId],
		references: [businesses.id],
		relationName: "businessReferrals_referrerId_businesses_id"
	}),
	business_referredBusinessId: one(businesses, {
		fields: [businessReferrals.referredBusinessId],
		references: [businesses.id],
		relationName: "businessReferrals_referredBusinessId_businesses_id"
	}),
}));

export const networkingEventsRelations = relations(networkingEvents, ({one, many}) => ({
	business: one(businesses, {
		fields: [networkingEvents.organizerId],
		references: [businesses.id]
	}),
	eventAttendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({one}) => ({
	networkingEvent: one(networkingEvents, {
		fields: [eventAttendees.eventId],
		references: [networkingEvents.id]
	}),
	business: one(businesses, {
		fields: [eventAttendees.businessId],
		references: [businesses.id]
	}),
}));