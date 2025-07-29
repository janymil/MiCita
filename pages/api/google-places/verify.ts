// pages/api/google-places/verify.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { GooglePlacesVerifier } from '../../../services/google-places-verifier';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessName, address, district, city } = req.body;

    // Validate required fields
    if (!businessName || !address) {
      return res.status(400).json({ 
        error: 'Nombre del negocio y dirección son requeridos' 
      });
    }

    const verifier = new GooglePlacesVerifier();
    
    // Search for matching businesses
    const candidates = await verifier.searchAndVerifyBusiness({
      businessName,
      address,
      district,
      city
    });

    // If no candidates found
    if (candidates.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron negocios que coincidan con los datos proporcionados',
        suggestions: [
          'Verifica que el nombre del negocio esté escrito correctamente',
          'Asegúrate de que la dirección sea exacta',
          'El negocio debe estar registrado en Google Maps'
        ]
      });
    }

    res.status(200).json({
      success: true,
      candidates,
      message: candidates.length === 1 
        ? 'Se encontró una coincidencia exacta'
        : `Se encontraron ${candidates.length} posibles coincidencias. Por favor selecciona la correcta.`
    });

  } catch (error) {
    console.error('Google Places verification error:', error);
    res.status(500).json({ 
      error: 'Error al verificar el negocio en Google Places',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
