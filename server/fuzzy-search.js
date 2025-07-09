/**
 * Fuzzy Search Engine for Enhanced Search Experience
 * 
 * This module provides intelligent search capabilities that handle:
 * - Typos and misspellings
 * - Similar/related terms
 * - Phonetic matching
 * - Abbreviations and variations
 */

// Levenshtein distance algorithm for typo detection
class FuzzySearch {
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Calculate similarity score (0-1, where 1 is exact match)
   */
  static calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLength - distance) / maxLength;
  }
  
  /**
   * Business category and service synonyms for better matching
   */
  static getSynonyms() {
    return {
      // Beauty/Belleza synonyms
      'belleza': ['beauty', 'estetica', 'estética', 'salon', 'salón', 'peluqueria', 'peluquería', 'spa'],
      'barberia': ['barbería', 'barber', 'barbershop', 'peluqueria masculina', 'corte masculino'],
      'peluqueria': ['peluquería', 'salon', 'salón', 'hair salon', 'belleza'],
      'spa': ['estetica', 'estética', 'relajacion', 'relajación', 'masajes', 'wellness'],
      'estetica': ['estética', 'beauty', 'belleza', 'spa', 'tratamientos'],
      
      // Food/Gastronomia synonyms  
      'gastronomia': ['gastronomía', 'comida', 'food', 'restaurant', 'restaurante'],
      'restaurante': ['restaurant', 'comida', 'gastronomia', 'gastronomía', 'food'],
      'comida': ['food', 'gastronomia', 'gastronomía', 'restaurante', 'restaurant'],
      'cafe': ['café', 'coffee', 'cafeteria', 'cafetería'],
      'bar': ['pub', 'cantina', 'taberna', 'drinks'],
      'pizzeria': ['pizzería', 'pizza', 'italiana'],
      'panaderia': ['panadería', 'bakery', 'pan', 'bread'],
      'pasteleria': ['pastelería', 'pastry', 'cake', 'postres'],
      
      // Health/Salud synonyms
      'salud': ['health', 'medico', 'médico', 'doctor', 'clinica', 'clínica'],
      'medico': ['médico', 'doctor', 'health', 'salud', 'clinica', 'clínica'],
      'doctor': ['médico', 'medico', 'health', 'salud'],
      'clinica': ['clínica', 'hospital', 'centro medico', 'centro médico'],
      'dentista': ['dental', 'odontologia', 'odontología', 'teeth'],
      'farmacia': ['pharmacy', 'medicina', 'medicinas', 'drugs'],
      
      // Fitness synonyms
      'fitness': ['gym', 'gimnasio', 'exercise', 'workout', 'deporte'],
      'gimnasio': ['gym', 'fitness', 'exercise', 'workout'],
      'deporte': ['sport', 'fitness', 'exercise', 'actividad fisica'],
      'yoga': ['meditation', 'meditacion', 'meditación', 'wellness'],
      
      // Services/Servicios synonyms
      'servicios': ['services', 'servicio'],
      'reparacion': ['reparación', 'repair', 'fix', 'arreglo'],
      'limpieza': ['cleaning', 'clean', 'limpiar'],
      'plomeria': ['plomería', 'plumber', 'fontaneria', 'fontanería'],
      'electricista': ['electrical', 'electrico', 'eléctrico'],
      'carpinteria': ['carpintería', 'carpenter', 'madera', 'wood'],
      
      // Automotive/Automotriz synonyms
      'automotriz': ['automotive', 'auto', 'car', 'vehiculo', 'vehículo'],
      'mecanica': ['mecánica', 'mechanic', 'repair', 'reparacion', 'reparación'],
      'taller': ['workshop', 'garage', 'mecanica', 'mecánica'],
      'llantas': ['tires', 'neumaticos', 'neumáticos', 'wheels'],
      'lavado': ['wash', 'car wash', 'limpieza auto']
    };
  }
  
  /**
   * Get expanded search terms including synonyms
   */
  static expandSearchTerms(query) {
    const synonyms = this.getSynonyms();
    const queryLower = query.toLowerCase().trim();
    const expandedTerms = new Set([queryLower]);
    
    // Add exact synonyms
    if (synonyms[queryLower]) {
      synonyms[queryLower].forEach(synonym => expandedTerms.add(synonym));
    }
    
    // Add fuzzy matches for synonyms
    Object.entries(synonyms).forEach(([key, values]) => {
      const similarity = this.calculateSimilarity(queryLower, key);
      if (similarity >= 0.8) { // 80% similarity threshold
        values.forEach(synonym => expandedTerms.add(synonym));
        expandedTerms.add(key);
      }
      
      // Check similarity with synonym values
      values.forEach(value => {
        const valueSimilarity = this.calculateSimilarity(queryLower, value);
        if (valueSimilarity >= 0.8) {
          expandedTerms.add(key);
          values.forEach(synonym => expandedTerms.add(synonym));
        }
      });
    });
    
    return Array.from(expandedTerms);
  }
  
  /**
   * Handle common typos and misspellings
   */
  static getTypoCorrections() {
    return {
      // Common Spanish typos
      'barberia': ['barbería', 'baveria', 'barbaria', 'barveria'],
      'peluqueria': ['peluquería', 'pelukeria', 'pelukería', 'peluqeria'],
      'farmacia': ['famacia', 'farmasia', 'pharmacia'],
      'restaurante': ['restorant', 'restorante', 'restaurant'],
      'gastronomia': ['gastronomía', 'gastronomie', 'gastronomy'],
      'gimnasio': ['jimnasio', 'gimnacio', 'gymsasio'],
      'clinica': ['clínica', 'klinica', 'clinika'],
      'estetica': ['estética', 'estetica', 'estetika'],
      
      // District typos
      'miraflores': ['miraflor', 'miraflres', 'mirafores'],
      'san isidro': ['san isidrio', 'san ysidro', 'sanisidro'],
      'san borja': ['san borha', 'sanborja', 'sam borja'],
      'surco': ['surko', 'suco', 'surco'],
      'barranco': ['baranco', 'barranko', 'barranco'],
      'lince': ['linse', 'lince', 'linze'],
      'brena': ['breña', 'brenia', 'brena'],
      'pueblo libre': ['pueblo libre', 'pueblo liber', 'pueblolibre'],
      'magdalena': ['magdalema', 'magdale', 'magdalana'],
      'jesus maria': ['jesús maría', 'jesus maria', 'jesusmaria'],
      
      // Service typos
      'masaje': ['masahe', 'massage', 'masag'],
      'corte': ['corte', 'kort', 'corthe'],
      'depilacion': ['depilación', 'depilasion', 'depilasión'],
      'manicure': ['manikure', 'manicur', 'manikur'],
      'pedicure': ['pedikure', 'pedicur', 'pedikur']
    };
  }
  
  /**
   * Find closest match for a potentially misspelled term
   */
  static findClosestMatch(query, dictionary) {
    const queryLower = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    dictionary.forEach(term => {
      const similarity = this.calculateSimilarity(queryLower, term.toLowerCase());
      if (similarity > bestScore && similarity >= 0.7) { // 70% threshold
        bestScore = similarity;
        bestMatch = term;
      }
    });
    
    return bestMatch;
  }
  
  /**
   * Process search query with fuzzy matching
   */
  static processQuery(originalQuery) {
    const query = originalQuery.toLowerCase().trim();
    const typoCorrections = this.getTypoCorrections();
    const synonyms = this.getSynonyms();
    
    // Check for direct typo corrections
    let correctedQuery = query;
    Object.entries(typoCorrections).forEach(([correct, typos]) => {
      typos.forEach(typo => {
        if (query.includes(typo)) {
          correctedQuery = correctedQuery.replace(typo, correct);
        }
      });
    });
    
    // Get expanded terms including synonyms
    const expandedTerms = this.expandSearchTerms(correctedQuery);
    
    // Build comprehensive search terms
    const searchTerms = new Set([
      originalQuery,
      correctedQuery,
      ...expandedTerms
    ]);
    
    return {
      originalQuery,
      correctedQuery: correctedQuery !== query ? correctedQuery : null,
      expandedTerms: Array.from(searchTerms),
      suggestions: expandedTerms.slice(0, 5) // Top 5 suggestions
    };
  }
  
  /**
   * Score business relevance with fuzzy matching
   */
  static scoreBusinessRelevance(business, processedQuery) {
    let score = 0;
    const { expandedTerms } = processedQuery;
    
    // Check name matches
    expandedTerms.forEach(term => {
      const nameSimilarity = this.calculateSimilarity(
        business.name.toLowerCase(), 
        term.toLowerCase()
      );
      score += nameSimilarity * 10; // Name matches are heavily weighted
      
      // Check if term is contained in name
      if (business.name.toLowerCase().includes(term.toLowerCase())) {
        score += 5;
      }
    });
    
    // Check category matches
    expandedTerms.forEach(term => {
      const categorySimilarity = this.calculateSimilarity(
        business.category.toLowerCase(), 
        term.toLowerCase()
      );
      score += categorySimilarity * 8; // Category matches are important
    });
    
    // Check address matches
    if (business.address) {
      expandedTerms.forEach(term => {
        if (business.address.toLowerCase().includes(term.toLowerCase())) {
          score += 3; // Address matches are less important
        }
      });
    }
    
    // Check description matches (if available)
    if (business.description) {
      expandedTerms.forEach(term => {
        if (business.description.toLowerCase().includes(term.toLowerCase())) {
          score += 2;
        }
      });
    }
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Main fuzzy search function
   */
  static search(query, businesses, options = {}) {
    const {
      maxResults = 50,
      minScore = 0.1,
      includeAnalysis = false
    } = options;
    
    console.log('🔍 Fuzzy search processing:', query);
    
    const processedQuery = this.processQuery(query);
    console.log('📝 Processed query:', processedQuery);
    
    // Score all businesses
    const scoredBusinesses = businesses.map(business => ({
      ...business,
      fuzzyScore: this.scoreBusinessRelevance(business, processedQuery)
    })).filter(business => business.fuzzyScore >= minScore);
    
    // Sort by fuzzy score (descending)
    scoredBusinesses.sort((a, b) => b.fuzzyScore - a.fuzzyScore);
    
    const results = scoredBusinesses.slice(0, maxResults);
    
    console.log(`✅ Fuzzy search found ${results.length} results`);
    
    if (includeAnalysis) {
      return {
        results,
        analysis: {
          originalQuery: processedQuery.originalQuery,
          correctedQuery: processedQuery.correctedQuery,
          expandedTerms: processedQuery.expandedTerms,
          suggestions: processedQuery.suggestions,
          totalMatches: results.length,
          averageScore: results.length > 0 
            ? (results.reduce((sum, b) => sum + b.fuzzyScore, 0) / results.length).toFixed(2)
            : 0
        }
      };
    }
    
    return results;
  }
}

export { FuzzySearch };