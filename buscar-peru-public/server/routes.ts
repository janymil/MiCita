import express, { type Express } from "express";
import { db } from "./db.js";
import { businesses, businessSettings, services, gallery, reviews, publicBusinesses, apifyBusinesses, searchAnalytics, insertSearchAnalyticsSchema } from "../shared/schema.js";
import { and, asc, desc, eq, gte, ilike, or, sql, isNotNull } from "drizzle-orm";

export function setupRoutes(app: Express) {
  
  // Search businesses with advanced filtering
  app.get("/api/search", async (req, res) => {
    try {
      const {
        q: query = "",
        category = "all",
        subcategory,
        city,
        district = "all",
        minRating = "0",
        sort = "relevance",
        page = "1",
        filters = "{}"
      } = req.query as Record<string, string>;

      const parsedFilters = JSON.parse(filters);
      const limit = 12;
      const offset = (parseInt(page) - 1) * limit;
      
      console.log("🔍 Enhanced search request:", {
        query,
        category,
        subcategory,
        city,
        district,
        minRating: parseFloat(minRating),
        filters: parsedFilters,
        sort,
        page: parseInt(page)
      });

      const startTime = Date.now();

      // Build search conditions for registered businesses
      const registeredConditions = [];
      const apifyConditions = [];

      // Text search
      if (query) {
        registeredConditions.push(
          or(
            ilike(businesses.name, `%${query}%`),
            ilike(businesses.description, `%${query}%`),
            ilike(businesses.address, `%${query}%`)
          )
        );
        apifyConditions.push(
          or(
            ilike(apifyBusinesses.name, `%${query}%`),
            ilike(apifyBusinesses.description, `%${query}%`),
            ilike(apifyBusinesses.address, `%${query}%`)
          )
        );
      }

      // Category filter
      if (category && category !== "all") {
        registeredConditions.push(eq(businesses.category, category));
        apifyConditions.push(eq(apifyBusinesses.category, category));
      }

      // Subcategory filter
      if (subcategory && subcategory !== "all") {
        apifyConditions.push(eq(apifyBusinesses.subcategory, subcategory));
      }

      // Location filters
      if (city) {
        registeredConditions.push(eq(businesses.city, city));
        apifyConditions.push(eq(apifyBusinesses.city, city));
      }

      if (district && district !== "all") {
        registeredConditions.push(eq(businesses.district, district));
        apifyConditions.push(eq(apifyBusinesses.district, district));
      }

      // Rating filter
      const minRatingNum = parseFloat(minRating);
      if (minRatingNum > 0) {
        registeredConditions.push(gte(businesses.rating, minRatingNum.toString()));
        apifyConditions.push(gte(apifyBusinesses.rating, minRatingNum.toString()));
      }

      // Business status filters
      registeredConditions.push(eq(businesses.isActive, true));

      // Apply additional filters
      if (parsedFilters.hasPhone === "true") {
        registeredConditions.push(isNotNull(businesses.phone));
        apifyConditions.push(isNotNull(apifyBusinesses.phone));
      }

      if (parsedFilters.hasWebsite === "true") {
        registeredConditions.push(isNotNull(businesses.website));
        apifyConditions.push(isNotNull(apifyBusinesses.website));
      }

      if (parsedFilters.hasEmail === "true") {
        registeredConditions.push(isNotNull(businesses.email));
        apifyConditions.push(isNotNull(apifyBusinesses.email));
      }

      // Sorting
      let orderBy;
      switch (sort) {
        case "rating":
          orderBy = desc(businesses.rating);
          break;
        case "name":
          orderBy = asc(businesses.name);
          break;
        case "newest":
          orderBy = desc(businesses.createdAt);
          break;
        default:
          orderBy = desc(businesses.isPremium);
      }

      // Execute searches
      const [registeredResults, apifyResults] = await Promise.all([
        db.select().from(businesses)
          .where(registeredConditions.length > 0 ? and(...registeredConditions) : undefined)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        
        db.select().from(apifyBusinesses)
          .where(apifyConditions.length > 0 ? and(...apifyConditions) : undefined)
          .orderBy(desc(apifyBusinesses.rating))
          .limit(limit)
          .offset(offset)
      ]);

      console.log("🏢 Registered businesses found:", registeredResults.length);

      // Get business settings for micrositio URLs
      const businessesWithSettings = await Promise.all(
        registeredResults.map(async (business) => {
          const settings = await db.select().from(businessSettings)
            .where(eq(businessSettings.businessId, business.id))
            .limit(1);
          
          return {
            ...business,
            customUrl: settings[0]?.customUrl || business.slug,
            source: "registered" as const
          };
        })
      );

      // Format Apify results
      const formattedApifyResults = apifyResults.map(business => ({
        ...business,
        source: "apify" as const
      }));

      // Combine results
      const allResults = [...businessesWithSettings, ...formattedApifyResults];

      // Get total count for pagination
      const [registeredCountResult, apifyCountResult] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(businesses)
          .where(registeredConditions.length > 0 ? and(...registeredConditions) : undefined),
        
        db.select({ count: sql`count(*)` }).from(apifyBusinesses)
          .where(apifyConditions.length > 0 ? and(...apifyConditions) : undefined)
      ]);

      const totalRegistered = Number(registeredCountResult[0]?.count || 0);
      const totalApify = Number(apifyCountResult[0]?.count || 0);
      const totalResults = totalRegistered + totalApify;

      const searchTime = Date.now() - startTime;

      console.log("🔍 Search results summary:", {
        totalApifyBusinesses: apifyCountResult[0]?.count,
        registeredBusinesses: registeredResults.length,
        totalResults,
        currentPage: parseInt(page),
        returnedResults: allResults.length,
        performanceTime: `${searchTime}ms`,
        cacheUsed: false,
        clustered: false
      });

      // Track search analytics
      try {
        await db.insert(searchAnalytics).values({
          query: query || null,
          category: category !== "all" ? category : null,
          location: city || null,
          resultsCount: totalResults,
          searchTime: `${searchTime}ms`,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || null
        });
        console.log("📊 Search tracked:", {
          query: query || '',
          category,
          resultsCount: totalResults,
          searchTime: `${searchTime}ms`,
          success: true
        });
      } catch (error) {
        console.error("Error tracking search:", error);
      }

      res.json({
        results: allResults,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalResults / limit),
          totalResults,
          hasNextPage: parseInt(page) * limit < totalResults,
          hasPrevPage: parseInt(page) > 1
        },
        searchInfo: {
          query,
          category,
          subcategory,
          city,
          district,
          searchTime: `${searchTime}ms`,
          totalRegistered,
          totalApify
        }
      });

    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ 
        message: "Error en la búsqueda",
        results: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalResults: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
  });

  // Get categories with counts
  app.get("/api/categories/counts", async (req, res) => {
    try {
      const [registeredCounts, apifyCounts] = await Promise.all([
        db.select({
          category: businesses.category,
          count: sql`count(*)`
        }).from(businesses)
          .where(eq(businesses.isActive, true))
          .groupBy(businesses.category),
        
        db.select({
          category: apifyBusinesses.category,
          count: sql`count(*)`
        }).from(apifyBusinesses)
          .groupBy(apifyBusinesses.category)
      ]);

      // Combine and sum counts
      const categoryMap = new Map();
      
      registeredCounts.forEach(item => {
        if (item.category) {
          categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + Number(item.count));
        }
      });
      
      apifyCounts.forEach(item => {
        if (item.category) {
          categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + Number(item.count));
        }
      });

      const result = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count: count.toString()
      }));

      res.json(result);
    } catch (error) {
      console.error("Error getting category counts:", error);
      res.json([]);
    }
  });

  // Get subcategories for a category
  app.get("/api/subcategories/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const { includeCounts } = req.query;

      if (includeCounts === "true") {
        const subcategoryCounts = await db.select({
          subcategory: apifyBusinesses.subcategory,
          count: sql`count(*)`
        }).from(apifyBusinesses)
          .where(eq(apifyBusinesses.category, category))
          .groupBy(apifyBusinesses.subcategory)
          .orderBy(desc(sql`count(*)`));

        res.json(subcategoryCounts.filter(item => item.subcategory));
      } else {
        const subcategories = await db.selectDistinct({
          subcategory: apifyBusinesses.subcategory
        }).from(apifyBusinesses)
          .where(eq(apifyBusinesses.category, category))
          .orderBy(apifyBusinesses.subcategory);

        res.json(subcategories.filter(item => item.subcategory).map(item => item.subcategory));
      }
    } catch (error) {
      console.error("Error getting subcategories:", error);
      res.json([]);
    }
  });

  // Get featured businesses
  app.get("/api/featured", async (req, res) => {
    try {
      const featured = await db.select().from(businesses)
        .where(and(
          eq(businesses.isActive, true),
          eq(businesses.isPremium, true)
        ))
        .orderBy(desc(businesses.rating))
        .limit(6);

      // Add customUrl from settings
      const featuredWithCustomUrl = await Promise.all(
        featured.map(async (business) => {
          const settings = await db.select().from(businessSettings)
            .where(eq(businessSettings.businessId, business.id))
            .limit(1);
          
          return {
            ...business,
            customUrl: settings[0]?.customUrl || business.slug,
            coverImage: settings[0]?.coverImage || business.coverImage
          };
        })
      );

      res.json(featuredWithCustomUrl);
    } catch (error) {
      console.error("Error getting featured businesses:", error);
      res.json([]);
    }
  });

  // Get business micrositio data
  app.get("/api/micrositio/:slug", async (req, res) => {
    const slug = req.params.slug;
    
    try {
      // Find business by customUrl in settings
      const businessQuery = await db.select({
        business: businesses,
        settings: businessSettings
      }).from(businesses)
        .leftJoin(businessSettings, eq(businesses.id, businessSettings.businessId))
        .where(eq(businessSettings.customUrl, slug))
        .limit(1);

      if (!businessQuery.length) {
        return res.status(404).json({ error: "Negocio no encontrado" });
      }

      const { business, settings } = businessQuery[0];

      // Get related data
      const [servicesData, galleryData, reviewsData] = await Promise.all([
        db.select().from(services)
          .where(and(eq(services.businessId, business.id), eq(services.isActive, true)))
          .orderBy(services.name),
        
        db.select().from(gallery)
          .where(eq(gallery.businessId, business.id))
          .orderBy(desc(gallery.isMain), gallery.createdAt),
        
        db.select().from(reviews)
          .where(eq(reviews.businessId, business.id))
          .orderBy(desc(reviews.createdAt))
          .limit(10)
      ]);

      res.json({
        business,
        settings,
        services: servicesData,
        gallery: galleryData,
        reviews: reviewsData
      });
    } catch (error) {
      console.error("Error in micrositio route:", error);
      res.status(500).json({ error: "Error obteniendo datos del negocio" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "BuscarPerú Public API" });
  });
}