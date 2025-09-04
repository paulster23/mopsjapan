exports.handler = async (event, context) => {
  // Handle CORS for React Native requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { mapId } = JSON.parse(event.body);
    
    if (!mapId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'mapId is required' }),
      };
    }

    // Construct KML URL using the forcekml parameter
    const kmlUrl = `https://www.google.com/maps/d/u/0/kml?mid=${mapId}&forcekml=1`;
    
    // Fetch KML data
    const response = await fetch(kmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/vnd.google-earth.kml+xml,application/xml,text/xml,*/*',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'My Maps not found or not publicly accessible',
            details: 'Make sure your My Maps is shared publicly and the URL is correct'
          }),
        };
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const kmlContent = await response.text();
    
    // Basic validation that we got KML content
    if (!kmlContent.includes('<kml') && !kmlContent.includes('<?xml')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid response from Google Maps',
          details: 'The response does not appear to be valid KML data'
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        kmlContent,
        mapId,
        fetchedAt: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error fetching KML:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch My Maps data',
        details: error.message
      }),
    };
  }
};