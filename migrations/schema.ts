import { pgTable, foreignKey, serial, text, jsonb, boolean, timestamp, integer, numeric, unique, varchar, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const businessSettings = pgTable("business_settings", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	theme: text().default('default'),
	primaryColor: text("primary_color"),
	bookingSettings: jsonb("booking_settings"),
	emailNotifications: boolean("email_notifications").default(true),
	smsNotifications: boolean("sms_notifications").default(false),
	customUrl: text("custom_url"),
	professionalTitle: text("professional_title"),
	publicDescription: text("public_description"),
	profileImage: text("profile_image"),
	coverImage: text("cover_image"),
	publicEmail: text("public_email"),
	publicPhone: text("public_phone"),
	streetAddress: text("street_address"),
	district: text(),
	region: text(),
	postalCode: text("postal_code"),
	country: text().default('Perú'),
	facebookUrl: text("facebook_url"),
	instagramUrl: text("instagram_url"),
	tiktokUrl: text("tiktok_url"),
	youtubeUrl: text("youtube_url"),
	enablePublicBooking: boolean("enable_public_booking").default(true),
	enableContactForm: boolean("enable_contact_form").default(true),
	enableGallery: boolean("enable_gallery").default(true),
	scheduleNotes: text("schedule_notes"),
	workingHours: jsonb("working_hours").default({"friday":{"end":"17:00","start":"09:00","enabled":true},"monday":{"end":"17:00","start":"09:00","enabled":true},"sunday":{"end":"17:00","start":"09:00","enabled":false},"tuesday":{"end":"17:00","start":"09:00","enabled":true},"saturday":{"end":"17:00","start":"09:00","enabled":true},"thursday":{"end":"17:00","start":"09:00","enabled":true},"wednesday":{"end":"17:00","start":"09:00","enabled":true}}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	blockedDates: jsonb("blocked_dates").default([]),
	blockedHours: jsonb("blocked_hours").default([]),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "business_settings_business_id_businesses_id_fk"
		}),
]);

export const appointments = pgTable("appointments", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	clientId: serial("client_id").notNull(),
	serviceId: serial("service_id").notNull(),
	date: text().notNull(),
	duration: integer().notNull(),
	status: text().default('pending').notNull(),
	notes: text(),
	price: numeric({ precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	time: text().notNull(),
	clientNotes: text("client_notes"),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "appointments_business_id_businesses_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "appointments_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "appointments_service_id_services_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const publicBusinesses = pgTable("public_businesses", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	description: text(),
	phone: text(),
	address: text(),
	city: text().default('Lima'),
	rating: numeric({ precision: 3, scale:  2 }).default('0'),
	reviewCount: integer("review_count").default(0),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const gallery = pgTable("gallery", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	imageUrl: text("image_url").notNull(),
	caption: text(),
	isMain: boolean("is_main").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "gallery_business_id_businesses_id_fk"
		}),
]);

export const reviews = pgTable("reviews", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	clientName: text("client_name").notNull(),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "reviews_business_id_businesses_id_fk"
		}),
]);

export const businesses = pgTable("businesses", {
	id: serial().primaryKey().notNull(),
	userId: serial("user_id").notNull(),
	name: text().notNull(),
	slug: text(),
	description: text(),
	category: text().notNull(),
	phone: text(),
	email: text(),
	address: text(),
	city: text().default('Lima'),
	country: text().default('Perú'),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	website: text(),
	logo: text(),
	coverImage: text("cover_image"),
	hours: jsonb(),
	isActive: boolean("is_active").default(true),
	isPremium: boolean("is_premium").default(false),
	rating: numeric({ precision: 3, scale:  2 }).default('0'),
	reviewCount: integer("review_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "businesses_user_id_users_id_fk"
		}),
	unique("businesses_slug_unique").on(table.slug),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "clients_business_id_businesses_id_fk"
		}),
]);

export const services = pgTable("services", {
	id: serial().primaryKey().notNull(),
	businessId: serial("business_id").notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }),
	duration: integer(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "services_business_id_businesses_id_fk"
		}),
]);

export const networkingPosts = pgTable("networking_posts", {
	id: serial().primaryKey().notNull(),
	businessId: integer("business_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: text().notNull(),
	postType: varchar("post_type", { length: 50 }).default('opportunity').notNull(),
	category: varchar({ length: 100 }),
	tags: text().array(),
	targetAudience: varchar("target_audience", { length: 50 }).default('all'),
	isActive: boolean("is_active").default(true),
	viewCount: integer("view_count").default(0),
	likeCount: integer("like_count").default(0),
	commentCount: integer("comment_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	attachments: jsonb().default([]),
}, (table) => [
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "networking_posts_business_id_fkey"
		}).onDelete("cascade"),
]);

export const networkingLikes = pgTable("networking_likes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	businessId: integer("business_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [networkingPosts.id],
			name: "networking_likes_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "networking_likes_business_id_fkey"
		}).onDelete("cascade"),
	unique("networking_likes_post_id_business_id_key").on(table.postId, table.businessId),
]);

export const networkingComments = pgTable("networking_comments", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	businessId: integer("business_id").notNull(),
	content: text().notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	parentId: integer("parent_id"),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [networkingPosts.id],
			name: "networking_comments_post_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "networking_comments_business_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "networking_comments_parent_id_fkey"
		}),
]);

export const businessConnections = pgTable("business_connections", {
	id: serial().primaryKey().notNull(),
	requesterId: integer("requester_id").notNull(),
	recipientId: integer("recipient_id").notNull(),
	connectionType: varchar("connection_type", { length: 50 }).default('general').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [businesses.id],
			name: "business_connections_requester_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [businesses.id],
			name: "business_connections_recipient_id_fkey"
		}).onDelete("cascade"),
]);

export const collaborationProjects = pgTable("collaboration_projects", {
	id: serial().primaryKey().notNull(),
	creatorId: integer("creator_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	projectType: varchar("project_type", { length: 50 }).default('joint_marketing').notNull(),
	requiredSkills: text("required_skills").array(),
	budget: varchar({ length: 100 }),
	timeline: varchar({ length: 100 }),
	status: varchar({ length: 20 }).default('open'),
	maxParticipants: integer("max_participants").default(10),
	currentParticipants: integer("current_participants").default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [businesses.id],
			name: "collaboration_projects_creator_id_fkey"
		}).onDelete("cascade"),
]);

export const apifyBusinesses = pgTable("apify_businesses", {
	id: serial().primaryKey().notNull(),
	placeId: text("place_id").notNull(),
	name: text().notNull(),
	address: text().notNull(),
	category: text().notNull(),
	rating: numeric({ precision: 3, scale:  2 }).default('0'),
	reviewCount: integer("review_count").default(0),
	priceLevel: integer("price_level").default(0),
	phone: text(),
	website: text(),
	photoUrl: text("photo_url"),
	latitude: numeric({ precision: 10, scale:  7 }).notNull(),
	longitude: numeric({ precision: 10, scale:  7 }).notNull(),
	openNow: boolean("open_now"),
	hours: jsonb(),
	searchTerms: text("search_terms"),
	isRegistered: boolean("is_registered").default(false),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	description: text(),
	services: text().array(),
	socialMedia: jsonb("social_media"),
	imageUrls: text("image_urls").array(),
	verifiedStatus: text("verified_status").default('unverified'),
	dataFreshnessScore: integer("data_freshness_score").default(0),
	phoneFormatted: text("phone_formatted"),
	phoneCountryCode: text("phone_country_code"),
	phoneIsValid: boolean("phone_is_valid").default(false),
	coordinatesValidated: boolean("coordinates_validated").default(false),
	coordinatesSource: text("coordinates_source"),
	businessStatus: text("business_status"),
	amenities: text().array(),
	priceRangeText: text("price_range_text"),
	lastScraped: timestamp("last_scraped", { mode: 'string' }).defaultNow(),
	scrapingSource: text("scraping_source").default('apify'),
	qualityScore: integer("quality_score").default(0),
	email: text(),
	streetViewUrl: text("street_view_url"),
	popularTimes: jsonb("popular_times"),
	currentPopularity: integer("current_popularity"),
	livePopularityStatus: text("live_popularity_status"),
	photos: jsonb(),
	subcategory: text(),
	district: text(),
	originalScrapedData: jsonb("original_scraped_data"),
	publicBadge: varchar("public_badge", { length: 50 }).default('unverified'),
	marketingBadge: varchar("marketing_badge", { length: 50 }).default('analyzing'),
	marketingPotentialScore: integer("marketing_potential_score").default(0),
	marketingOpportunities: jsonb("marketing_opportunities").default([]),
	lastBadgeAnalysis: timestamp("last_badge_analysis", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	isClaimedGoogle: boolean("is_claimed_google").default(false),
	hasWebsiteAnalysis: boolean("has_website_analysis").default(false),
	digitalPresenceScore: integer("digital_presence_score").default(0),
	marketingNotes: text("marketing_notes"),
}, (table) => [
	index("idx_apify_businesses_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_apify_businesses_district").using("btree", table.district.asc().nullsLast().op("text_ops")),
	index("idx_apify_businesses_location").using("btree", table.latitude.asc().nullsLast().op("numeric_ops"), table.longitude.asc().nullsLast().op("numeric_ops")),
	index("idx_apify_businesses_marketing_badge").using("btree", table.marketingBadge.asc().nullsLast().op("text_ops")),
	index("idx_apify_businesses_marketing_potential").using("btree", table.marketingPotentialScore.desc().nullsFirst().op("int4_ops")),
	index("idx_apify_businesses_public_badge").using("btree", table.publicBadge.asc().nullsLast().op("text_ops")),
	index("idx_apify_businesses_rating").using("btree", table.rating.asc().nullsLast().op("numeric_ops")),
	unique("apify_businesses_place_id_key").on(table.placeId),
]);

export const collaborationParticipants = pgTable("collaboration_participants", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	businessId: integer("business_id").notNull(),
	role: varchar({ length: 100 }),
	contributionDescription: text("contribution_description"),
	isActive: boolean("is_active").default(true),
	joinedAt: timestamp("joined_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [collaborationProjects.id],
			name: "collaboration_participants_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "collaboration_participants_business_id_fkey"
		}).onDelete("cascade"),
	unique("collaboration_participants_project_id_business_id_key").on(table.projectId, table.businessId),
]);

export const businessReferrals = pgTable("business_referrals", {
	id: serial().primaryKey().notNull(),
	referrerId: integer("referrer_id").notNull(),
	referredBusinessId: integer("referred_business_id").notNull(),
	clientName: varchar("client_name", { length: 100 }).notNull(),
	clientEmail: varchar("client_email", { length: 100 }),
	clientPhone: varchar("client_phone", { length: 20 }),
	serviceRequested: varchar("service_requested", { length: 200 }),
	referralNotes: text("referral_notes"),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.referrerId],
			foreignColumns: [businesses.id],
			name: "business_referrals_referrer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.referredBusinessId],
			foreignColumns: [businesses.id],
			name: "business_referrals_referred_business_id_fkey"
		}).onDelete("cascade"),
]);

export const networkingEvents = pgTable("networking_events", {
	id: serial().primaryKey().notNull(),
	organizerId: integer("organizer_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	eventType: varchar("event_type", { length: 50 }).default('meetup').notNull(),
	venue: varchar({ length: 200 }),
	address: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	maxAttendees: integer("max_attendees"),
	currentAttendees: integer("current_attendees").default(0),
	ticketPrice: varchar("ticket_price", { length: 20 }).default('0'),
	tags: text().array(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [businesses.id],
			name: "networking_events_organizer_id_fkey"
		}).onDelete("cascade"),
]);

export const eventAttendees = pgTable("event_attendees", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	businessId: integer("business_id").notNull(),
	attendeeStatus: varchar("attendee_status", { length: 20 }).default('registered'),
	specialRequests: text("special_requests"),
	registeredAt: timestamp("registered_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [networkingEvents.id],
			name: "event_attendees_event_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.businessId],
			foreignColumns: [businesses.id],
			name: "event_attendees_business_id_fkey"
		}).onDelete("cascade"),
	unique("event_attendees_event_id_business_id_key").on(table.eventId, table.businessId),
]);

export const openstreetBusinesses = pgTable("openstreet_businesses", {
	id: serial().primaryKey().notNull(),
	osmId: text("osm_id").notNull(),
	osmType: text("osm_type"),
	name: text(),
	amenity: text(),
	shop: text(),
	address: text(),
	houseNumber: text("house_number"),
	street: text(),
	city: text(),
	district: text(),
	postcode: text(),
	phone: text(),
	website: text(),
	email: text(),
	openingHours: text("opening_hours"),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	building: text(),
	buildingLevels: text("building_levels"),
	operator: text(),
	brand: text(),
	cuisine: text(),
	wheelchair: text(),
	category: text().default('servicios'),
	subcategory: text(),
	tags: jsonb(),
	geometry: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	rating: numeric({ precision: 3, scale:  2 }).default('0'),
	reviewCount: integer("review_count").default(0),
	priceLevel: integer("price_level").default(0),
	openNow: boolean("open_now"),
	hours: jsonb(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	photoUrl: text("photo_url"),
	streetViewUrl: text("street_view_url"),
	photos: jsonb().default([]),
	popularTimes: jsonb("popular_times"),
	currentPopularity: integer("current_popularity"),
	livePopularityStatus: text("live_popularity_status"),
	description: text(),
	services: text().array(),
	socialMedia: jsonb("social_media").default({}),
	imageUrls: text("image_urls").array(),
	verifiedStatus: text("verified_status").default('unverified'),
	dataFreshnessScore: integer("data_freshness_score").default(0),
	phoneFormatted: text("phone_formatted"),
	phoneCountryCode: text("phone_country_code").default('+51'),
	coordinatesValidated: boolean("coordinates_validated").default(false),
	businessStatus: text("business_status").default('unknown'),
	amenities: jsonb().default({}),
	priceRangeText: text("price_range_text"),
	lastScraped: timestamp("last_scraped", { mode: 'string' }).defaultNow(),
	scrapingSource: text("scraping_source").default('openstreetmap'),
	qualityScore: integer("quality_score").default(0),
	originalScrapedData: jsonb("original_scraped_data"),
	isRegistered: boolean("is_registered").default(false),
	searchTerms: text("search_terms"),
	publicBadge: text("public_badge").default('unverified'),
	marketingBadge: text("marketing_badge").default('analyzing'),
	marketingPotentialScore: integer("marketing_potential_score").default(0),
	marketingOpportunities: jsonb("marketing_opportunities").default([]),
	lastBadgeAnalysis: timestamp("last_badge_analysis", { mode: 'string' }).defaultNow(),
	isClaimedGoogle: boolean("is_claimed_google").default(false),
	hasWebsiteAnalysis: boolean("has_website_analysis").default(false),
	digitalPresenceScore: integer("digital_presence_score").default(0),
	marketingNotes: text("marketing_notes"),
}, (table) => [
	index("idx_openstreet_businesses_amenity").using("btree", table.amenity.asc().nullsLast().op("text_ops")),
	index("idx_openstreet_businesses_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_openstreet_businesses_district").using("btree", table.district.asc().nullsLast().op("text_ops")),
	index("idx_openstreet_businesses_marketing_badge").using("btree", table.marketingBadge.asc().nullsLast().op("text_ops")),
	index("idx_openstreet_businesses_public_badge").using("btree", table.publicBadge.asc().nullsLast().op("text_ops")),
	index("idx_openstreet_businesses_rating").using("btree", table.rating.asc().nullsLast().op("numeric_ops")),
	unique("openstreet_businesses_osm_id_key").on(table.osmId),
]);
