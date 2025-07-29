--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: apify_businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apify_businesses (
    id integer NOT NULL,
    place_id text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    category text NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    price_level integer DEFAULT 0,
    phone text,
    website text,
    photo_url text,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    open_now boolean,
    hours jsonb,
    search_terms text,
    is_registered boolean DEFAULT false,
    last_updated timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    description text,
    services text[],
    social_media jsonb,
    image_urls text[],
    verified_status text DEFAULT 'unverified'::text,
    data_freshness_score integer DEFAULT 0,
    phone_formatted text,
    phone_country_code text,
    phone_is_valid boolean DEFAULT false,
    coordinates_validated boolean DEFAULT false,
    coordinates_source text,
    business_status text,
    amenities text[],
    price_range_text text,
    last_scraped timestamp without time zone DEFAULT now(),
    scraping_source text DEFAULT 'apify'::text,
    quality_score integer DEFAULT 0,
    email text,
    street_view_url text,
    popular_times jsonb,
    current_popularity integer,
    live_popularity_status text,
    photos jsonb,
    subcategory text,
    district text,
    original_scraped_data jsonb,
    public_badge character varying(50) DEFAULT 'unverified'::character varying,
    marketing_badge character varying(50) DEFAULT 'analyzing'::character varying,
    marketing_potential_score integer DEFAULT 0,
    marketing_opportunities jsonb DEFAULT '[]'::jsonb,
    last_badge_analysis timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_claimed_google boolean DEFAULT false,
    has_website_analysis boolean DEFAULT false,
    digital_presence_score integer DEFAULT 0,
    marketing_notes text
);


--
-- Name: COLUMN apify_businesses.public_badge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apify_businesses.public_badge IS 'Public badge shown to users: verified, claimed, unverified, trusted, premium';


--
-- Name: COLUMN apify_businesses.marketing_badge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apify_businesses.marketing_badge IS 'Internal marketing opportunity: high_potential, email_ready, website_needed, digital_upgrade, claimed, no_opportunity';


--
-- Name: COLUMN apify_businesses.marketing_potential_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apify_businesses.marketing_potential_score IS 'AI calculated score 0-100 for marketing potential';


--
-- Name: COLUMN apify_businesses.marketing_opportunities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apify_businesses.marketing_opportunities IS 'Array of marketing services: website, seo, social_media, photography, google_business';


--
-- Name: apify_businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.apify_businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: apify_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.apify_businesses_id_seq OWNED BY public.apify_businesses.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    business_id integer NOT NULL,
    client_id integer NOT NULL,
    service_id integer NOT NULL,
    date text NOT NULL,
    duration integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT now(),
    "time" text NOT NULL,
    client_notes text
);


--
-- Name: appointments_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_business_id_seq OWNED BY public.appointments.business_id;


--
-- Name: appointments_client_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_client_id_seq OWNED BY public.appointments.client_id;


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: appointments_service_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_service_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_service_id_seq OWNED BY public.appointments.service_id;


--
-- Name: business_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_connections (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    recipient_id integer NOT NULL,
    connection_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: business_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_connections_id_seq OWNED BY public.business_connections.id;


--
-- Name: business_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_referrals (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    referred_business_id integer NOT NULL,
    client_name character varying(100) NOT NULL,
    client_email character varying(100),
    client_phone character varying(20),
    service_requested character varying(200),
    referral_notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: business_referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_referrals_id_seq OWNED BY public.business_referrals.id;


--
-- Name: business_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_settings (
    id integer NOT NULL,
    business_id integer NOT NULL,
    theme text DEFAULT 'default'::text,
    primary_color text,
    booking_settings jsonb,
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    custom_url text,
    professional_title text,
    public_description text,
    profile_image text,
    cover_image text,
    public_email text,
    public_phone text,
    street_address text,
    district text,
    region text,
    postal_code text,
    country text DEFAULT 'Perú'::text,
    facebook_url text,
    instagram_url text,
    tiktok_url text,
    youtube_url text,
    enable_public_booking boolean DEFAULT true,
    enable_contact_form boolean DEFAULT true,
    enable_gallery boolean DEFAULT true,
    schedule_notes text,
    working_hours jsonb DEFAULT '{"friday": {"end": "17:00", "start": "09:00", "enabled": true}, "monday": {"end": "17:00", "start": "09:00", "enabled": true}, "sunday": {"end": "17:00", "start": "09:00", "enabled": false}, "tuesday": {"end": "17:00", "start": "09:00", "enabled": true}, "saturday": {"end": "17:00", "start": "09:00", "enabled": true}, "thursday": {"end": "17:00", "start": "09:00", "enabled": true}, "wednesday": {"end": "17:00", "start": "09:00", "enabled": true}}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    blocked_dates jsonb DEFAULT '[]'::jsonb,
    blocked_hours jsonb DEFAULT '[]'::jsonb,
    scraped_data jsonb,
    last_scraped_at timestamp without time zone,
    scraping_quality_score integer
);


--
-- Name: COLUMN business_settings.scraped_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_settings.scraped_data IS 'Latest processed scraping data applied to this business';


--
-- Name: COLUMN business_settings.last_scraped_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_settings.last_scraped_at IS 'Timestamp of last successful scraping operation';


--
-- Name: COLUMN business_settings.scraping_quality_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_settings.scraping_quality_score IS 'Quality score of last scraping operation';


--
-- Name: business_settings_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_settings_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_settings_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_settings_business_id_seq OWNED BY public.business_settings.business_id;


--
-- Name: business_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_settings_id_seq OWNED BY public.business_settings.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    category text NOT NULL,
    phone text,
    email text,
    address text,
    city text DEFAULT 'Lima'::text,
    country text DEFAULT 'Perú'::text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    website text,
    logo text,
    cover_image text,
    hours jsonb,
    is_active boolean DEFAULT true,
    is_premium boolean DEFAULT false,
    rating numeric(3,2) DEFAULT '0'::numeric,
    review_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: businesses_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.businesses_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: businesses_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.businesses_user_id_seq OWNED BY public.businesses.user_id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: clients_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_business_id_seq OWNED BY public.clients.business_id;


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: collaboration_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collaboration_participants (
    id integer NOT NULL,
    project_id integer NOT NULL,
    business_id integer NOT NULL,
    role character varying(100),
    contribution_description text,
    is_active boolean DEFAULT true,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: collaboration_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collaboration_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collaboration_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collaboration_participants_id_seq OWNED BY public.collaboration_participants.id;


--
-- Name: collaboration_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collaboration_projects (
    id integer NOT NULL,
    creator_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    project_type character varying(50) DEFAULT 'joint_marketing'::character varying NOT NULL,
    required_skills text[],
    budget character varying(100),
    timeline character varying(100),
    status character varying(20) DEFAULT 'open'::character varying,
    max_participants integer DEFAULT 10,
    current_participants integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: collaboration_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collaboration_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collaboration_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collaboration_projects_id_seq OWNED BY public.collaboration_projects.id;


--
-- Name: event_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_attendees (
    id integer NOT NULL,
    event_id integer NOT NULL,
    business_id integer NOT NULL,
    attendee_status character varying(20) DEFAULT 'registered'::character varying,
    special_requests text,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: event_attendees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_attendees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_attendees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_attendees_id_seq OWNED BY public.event_attendees.id;


--
-- Name: gallery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery (
    id integer NOT NULL,
    business_id integer NOT NULL,
    image_url text NOT NULL,
    caption text,
    is_main boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: gallery_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gallery_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gallery_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gallery_business_id_seq OWNED BY public.gallery.business_id;


--
-- Name: gallery_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gallery_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gallery_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gallery_id_seq OWNED BY public.gallery.id;


--
-- Name: networking_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networking_comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    business_id integer NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id integer
);


--
-- Name: networking_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networking_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networking_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networking_comments_id_seq OWNED BY public.networking_comments.id;


--
-- Name: networking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networking_events (
    id integer NOT NULL,
    organizer_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    event_type character varying(50) DEFAULT 'meetup'::character varying NOT NULL,
    venue character varying(200),
    address text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    max_attendees integer,
    current_attendees integer DEFAULT 0,
    ticket_price character varying(20) DEFAULT '0'::character varying,
    tags text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: networking_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networking_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networking_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networking_events_id_seq OWNED BY public.networking_events.id;


--
-- Name: networking_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networking_likes (
    id integer NOT NULL,
    post_id integer NOT NULL,
    business_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: networking_likes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networking_likes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networking_likes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networking_likes_id_seq OWNED BY public.networking_likes.id;


--
-- Name: networking_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.networking_posts (
    id integer NOT NULL,
    business_id integer NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    post_type character varying(50) DEFAULT 'opportunity'::character varying NOT NULL,
    category character varying(100),
    tags text[],
    target_audience character varying(50) DEFAULT 'all'::character varying,
    is_active boolean DEFAULT true,
    view_count integer DEFAULT 0,
    like_count integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attachments jsonb DEFAULT '[]'::jsonb
);


--
-- Name: networking_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.networking_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: networking_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.networking_posts_id_seq OWNED BY public.networking_posts.id;


--
-- Name: openstreet_businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.openstreet_businesses (
    id integer NOT NULL,
    osm_id text NOT NULL,
    osm_type text,
    name text,
    amenity text,
    shop text,
    address text,
    house_number text,
    street text,
    city text,
    district text,
    postcode text,
    phone text,
    website text,
    email text,
    opening_hours text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    building text,
    building_levels text,
    operator text,
    brand text,
    cuisine text,
    wheelchair text,
    category text DEFAULT 'servicios'::text,
    subcategory text,
    tags jsonb,
    geometry jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    price_level integer DEFAULT 0,
    open_now boolean,
    hours jsonb,
    last_updated timestamp without time zone DEFAULT now(),
    photo_url text,
    street_view_url text,
    photos jsonb DEFAULT '[]'::jsonb,
    popular_times jsonb,
    current_popularity integer,
    live_popularity_status text,
    description text,
    services text[],
    social_media jsonb DEFAULT '{}'::jsonb,
    image_urls text[],
    verified_status text DEFAULT 'unverified'::text,
    data_freshness_score integer DEFAULT 0,
    phone_formatted text,
    phone_country_code text DEFAULT '+51'::text,
    coordinates_validated boolean DEFAULT false,
    business_status text DEFAULT 'unknown'::text,
    amenities jsonb DEFAULT '{}'::jsonb,
    price_range_text text,
    last_scraped timestamp without time zone DEFAULT now(),
    scraping_source text DEFAULT 'openstreetmap'::text,
    quality_score integer DEFAULT 0,
    original_scraped_data jsonb,
    is_registered boolean DEFAULT false,
    search_terms text,
    public_badge text DEFAULT 'unverified'::text,
    marketing_badge text DEFAULT 'analyzing'::text,
    marketing_potential_score integer DEFAULT 0,
    marketing_opportunities jsonb DEFAULT '[]'::jsonb,
    last_badge_analysis timestamp without time zone DEFAULT now(),
    is_claimed_google boolean DEFAULT false,
    has_website_analysis boolean DEFAULT false,
    digital_presence_score integer DEFAULT 0,
    marketing_notes text
);


--
-- Name: openstreet_businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.openstreet_businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: openstreet_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.openstreet_businesses_id_seq OWNED BY public.openstreet_businesses.id;


--
-- Name: public_businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_businesses (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    phone text,
    address text,
    city text DEFAULT 'Lima'::text,
    rating numeric(3,2) DEFAULT '0'::numeric,
    review_count integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: public_businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.public_businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: public_businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.public_businesses_id_seq OWNED BY public.public_businesses.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    business_id integer NOT NULL,
    client_name text NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: reviews_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_business_id_seq OWNED BY public.reviews.business_id;


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: scraping_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scraping_jobs (
    id integer NOT NULL,
    business_id integer,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sources jsonb NOT NULL,
    raw_data jsonb,
    processed_data jsonb,
    quality_score integer,
    progress integer DEFAULT 0,
    current_step character varying(255),
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


--
-- Name: TABLE scraping_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scraping_jobs IS 'Stores automated scraping job information and results';


--
-- Name: COLUMN scraping_jobs.sources; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scraping_jobs.sources IS 'JSON object containing URLs and search queries for scraping sources';


--
-- Name: COLUMN scraping_jobs.raw_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scraping_jobs.raw_data IS 'Raw data extracted from all sources before processing';


--
-- Name: COLUMN scraping_jobs.processed_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scraping_jobs.processed_data IS 'Cleaned and merged data ready for micrositio population';


--
-- Name: COLUMN scraping_jobs.quality_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scraping_jobs.quality_score IS 'Overall quality score of scraped data (0-100)';


--
-- Name: scraping_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scraping_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scraping_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scraping_jobs_id_seq OWNED BY public.scraping_jobs.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2),
    duration integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: services_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_business_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_business_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_business_id_seq OWNED BY public.services.business_id;


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    dashboard_theme text DEFAULT 'clasico'::text,
    primary_color text DEFAULT '#dc2626'::text,
    is_dark_mode boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: apify_businesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apify_businesses ALTER COLUMN id SET DEFAULT nextval('public.apify_businesses_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: appointments business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN business_id SET DEFAULT nextval('public.appointments_business_id_seq'::regclass);


--
-- Name: appointments client_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN client_id SET DEFAULT nextval('public.appointments_client_id_seq'::regclass);


--
-- Name: appointments service_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN service_id SET DEFAULT nextval('public.appointments_service_id_seq'::regclass);


--
-- Name: business_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_connections ALTER COLUMN id SET DEFAULT nextval('public.business_connections_id_seq'::regclass);


--
-- Name: business_referrals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_referrals ALTER COLUMN id SET DEFAULT nextval('public.business_referrals_id_seq'::regclass);


--
-- Name: business_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_settings ALTER COLUMN id SET DEFAULT nextval('public.business_settings_id_seq'::regclass);


--
-- Name: business_settings business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_settings ALTER COLUMN business_id SET DEFAULT nextval('public.business_settings_business_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: businesses user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses ALTER COLUMN user_id SET DEFAULT nextval('public.businesses_user_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: clients business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN business_id SET DEFAULT nextval('public.clients_business_id_seq'::regclass);


--
-- Name: collaboration_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_participants ALTER COLUMN id SET DEFAULT nextval('public.collaboration_participants_id_seq'::regclass);


--
-- Name: collaboration_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_projects ALTER COLUMN id SET DEFAULT nextval('public.collaboration_projects_id_seq'::regclass);


--
-- Name: event_attendees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees ALTER COLUMN id SET DEFAULT nextval('public.event_attendees_id_seq'::regclass);


--
-- Name: gallery id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery ALTER COLUMN id SET DEFAULT nextval('public.gallery_id_seq'::regclass);


--
-- Name: gallery business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery ALTER COLUMN business_id SET DEFAULT nextval('public.gallery_business_id_seq'::regclass);


--
-- Name: networking_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_comments ALTER COLUMN id SET DEFAULT nextval('public.networking_comments_id_seq'::regclass);


--
-- Name: networking_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_events ALTER COLUMN id SET DEFAULT nextval('public.networking_events_id_seq'::regclass);


--
-- Name: networking_likes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_likes ALTER COLUMN id SET DEFAULT nextval('public.networking_likes_id_seq'::regclass);


--
-- Name: networking_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_posts ALTER COLUMN id SET DEFAULT nextval('public.networking_posts_id_seq'::regclass);


--
-- Name: openstreet_businesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.openstreet_businesses ALTER COLUMN id SET DEFAULT nextval('public.openstreet_businesses_id_seq'::regclass);


--
-- Name: public_businesses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_businesses ALTER COLUMN id SET DEFAULT nextval('public.public_businesses_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: reviews business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN business_id SET DEFAULT nextval('public.reviews_business_id_seq'::regclass);


--
-- Name: scraping_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraping_jobs ALTER COLUMN id SET DEFAULT nextval('public.scraping_jobs_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: services business_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN business_id SET DEFAULT nextval('public.services_business_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: apify_businesses apify_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apify_businesses
    ADD CONSTRAINT apify_businesses_pkey PRIMARY KEY (id);


--
-- Name: apify_businesses apify_businesses_place_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apify_businesses
    ADD CONSTRAINT apify_businesses_place_id_key UNIQUE (place_id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: business_connections business_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_connections
    ADD CONSTRAINT business_connections_pkey PRIMARY KEY (id);


--
-- Name: business_referrals business_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_referrals
    ADD CONSTRAINT business_referrals_pkey PRIMARY KEY (id);


--
-- Name: business_settings business_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_slug_unique UNIQUE (slug);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: collaboration_participants collaboration_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_participants
    ADD CONSTRAINT collaboration_participants_pkey PRIMARY KEY (id);


--
-- Name: collaboration_participants collaboration_participants_project_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_participants
    ADD CONSTRAINT collaboration_participants_project_id_business_id_key UNIQUE (project_id, business_id);


--
-- Name: collaboration_projects collaboration_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_projects
    ADD CONSTRAINT collaboration_projects_pkey PRIMARY KEY (id);


--
-- Name: event_attendees event_attendees_event_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_business_id_key UNIQUE (event_id, business_id);


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (id);


--
-- Name: gallery gallery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery
    ADD CONSTRAINT gallery_pkey PRIMARY KEY (id);


--
-- Name: networking_comments networking_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_comments
    ADD CONSTRAINT networking_comments_pkey PRIMARY KEY (id);


--
-- Name: networking_events networking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_events
    ADD CONSTRAINT networking_events_pkey PRIMARY KEY (id);


--
-- Name: networking_likes networking_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_likes
    ADD CONSTRAINT networking_likes_pkey PRIMARY KEY (id);


--
-- Name: networking_likes networking_likes_post_id_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_likes
    ADD CONSTRAINT networking_likes_post_id_business_id_key UNIQUE (post_id, business_id);


--
-- Name: networking_posts networking_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_posts
    ADD CONSTRAINT networking_posts_pkey PRIMARY KEY (id);


--
-- Name: openstreet_businesses openstreet_businesses_osm_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.openstreet_businesses
    ADD CONSTRAINT openstreet_businesses_osm_id_key UNIQUE (osm_id);


--
-- Name: openstreet_businesses openstreet_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.openstreet_businesses
    ADD CONSTRAINT openstreet_businesses_pkey PRIMARY KEY (id);


--
-- Name: public_businesses public_businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_businesses
    ADD CONSTRAINT public_businesses_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: scraping_jobs scraping_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraping_jobs
    ADD CONSTRAINT scraping_jobs_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_apify_businesses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_category ON public.apify_businesses USING btree (category);


--
-- Name: idx_apify_businesses_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_district ON public.apify_businesses USING btree (district);


--
-- Name: idx_apify_businesses_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_location ON public.apify_businesses USING btree (latitude, longitude);


--
-- Name: idx_apify_businesses_marketing_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_marketing_badge ON public.apify_businesses USING btree (marketing_badge);


--
-- Name: idx_apify_businesses_marketing_potential; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_marketing_potential ON public.apify_businesses USING btree (marketing_potential_score DESC);


--
-- Name: idx_apify_businesses_public_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_public_badge ON public.apify_businesses USING btree (public_badge);


--
-- Name: idx_apify_businesses_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apify_businesses_rating ON public.apify_businesses USING btree (rating);


--
-- Name: idx_business_settings_last_scraped_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_settings_last_scraped_at ON public.business_settings USING btree (last_scraped_at);


--
-- Name: idx_business_settings_quality_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_settings_quality_score ON public.business_settings USING btree (scraping_quality_score);


--
-- Name: idx_openstreet_businesses_amenity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_amenity ON public.openstreet_businesses USING btree (amenity);


--
-- Name: idx_openstreet_businesses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_category ON public.openstreet_businesses USING btree (category);


--
-- Name: idx_openstreet_businesses_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_district ON public.openstreet_businesses USING btree (district);


--
-- Name: idx_openstreet_businesses_marketing_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_marketing_badge ON public.openstreet_businesses USING btree (marketing_badge);


--
-- Name: idx_openstreet_businesses_public_badge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_public_badge ON public.openstreet_businesses USING btree (public_badge);


--
-- Name: idx_openstreet_businesses_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_openstreet_businesses_rating ON public.openstreet_businesses USING btree (rating);


--
-- Name: idx_scraping_jobs_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scraping_jobs_business_id ON public.scraping_jobs USING btree (business_id);


--
-- Name: idx_scraping_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scraping_jobs_created_at ON public.scraping_jobs USING btree (created_at);


--
-- Name: idx_scraping_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scraping_jobs_status ON public.scraping_jobs USING btree (status);


--
-- Name: user_preferences_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_preferences_user_id_unique ON public.user_preferences USING btree (user_id);


--
-- Name: appointments appointments_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: appointments appointments_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: appointments appointments_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: business_connections business_connections_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_connections
    ADD CONSTRAINT business_connections_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_connections business_connections_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_connections
    ADD CONSTRAINT business_connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_referrals business_referrals_referred_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_referrals
    ADD CONSTRAINT business_referrals_referred_business_id_fkey FOREIGN KEY (referred_business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_referrals business_referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_referrals
    ADD CONSTRAINT business_referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_settings business_settings_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: businesses businesses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: clients clients_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: collaboration_participants collaboration_participants_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_participants
    ADD CONSTRAINT collaboration_participants_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: collaboration_participants collaboration_participants_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_participants
    ADD CONSTRAINT collaboration_participants_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.collaboration_projects(id) ON DELETE CASCADE;


--
-- Name: collaboration_projects collaboration_projects_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaboration_projects
    ADD CONSTRAINT collaboration_projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;


--
-- Name: gallery gallery_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery
    ADD CONSTRAINT gallery_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: networking_comments networking_comments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_comments
    ADD CONSTRAINT networking_comments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: networking_comments networking_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_comments
    ADD CONSTRAINT networking_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.networking_comments(id);


--
-- Name: networking_comments networking_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_comments
    ADD CONSTRAINT networking_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.networking_posts(id) ON DELETE CASCADE;


--
-- Name: networking_events networking_events_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_events
    ADD CONSTRAINT networking_events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: networking_likes networking_likes_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_likes
    ADD CONSTRAINT networking_likes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: networking_likes networking_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_likes
    ADD CONSTRAINT networking_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.networking_posts(id) ON DELETE CASCADE;


--
-- Name: networking_posts networking_posts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.networking_posts
    ADD CONSTRAINT networking_posts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: scraping_jobs scraping_jobs_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scraping_jobs
    ADD CONSTRAINT scraping_jobs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: services services_business_id_businesses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_businesses_id_fk FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: user_preferences user_preferences_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

