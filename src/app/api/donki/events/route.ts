import { NextRequest, NextResponse } from 'next/server';

// Helper function to fetch recent flares from NOAA SWPC
async function fetchNOAAFlares(startDate: Date, endDate: Date) {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/solar_flares/flares_7day.json');
    if (!response.ok) return [];
    
    const flares = await response.json();
    return flares
      .filter((f: any) => {
        const flareTime = new Date(f.time_tag || f.begin_time);
        return flareTime >= startDate && flareTime <= endDate;
      })
      .map((f: any) => ({
        eventID: `${f.time_tag}-FLR-NOAA`,
        eventType: 'FLR',
        beginTime: f.begin_time || f.time_tag,
        endTime: f.end_time,
        peakTime: f.peak_time,
        sourceLocation: f.active_region_location || f.location,
        activeRegionNum: f.active_region_number,
        classType: f.goes_class || f.current_class,
        instruments: [{ displayName: 'GOES: EXIS' }],
        linkedEvents: [],
        source: 'NOAA_SWPC'
      }));
  } catch (error) {
    console.warn('Failed to fetch NOAA flares:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '7d';
    const eventType = searchParams.get('eventType') || 'all';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '3d':
        startDate.setDate(startDate.getDate() - 3);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Format dates for NASA DONKI API (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // NASA DONKI API endpoints
    // Note: DEMO_KEY has strict rate limits. Consider getting a free NASA API key at https://api.nasa.gov/
    const baseUrl = 'https://api.nasa.gov/DONKI';
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    
    const endpoints = {
      FLR: `${baseUrl}/FLR?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      CME: `${baseUrl}/CME?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      SEP: `${baseUrl}/SEP?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      IPS: `${baseUrl}/IPS?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      MPC: `${baseUrl}/MPC?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      GST: `${baseUrl}/GST?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`,
      RBE: `${baseUrl}/RBE?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${apiKey}`
    };

    let eventsToFetch = Object.keys(endpoints);
    if (eventType !== 'all') {
      eventsToFetch = [eventType.toUpperCase()];
    }

    // Fetch events from NASA DONKI API
    const eventPromises = eventsToFetch.map(async (type) => {
      try {
        const response = await fetch(endpoints[type as keyof typeof endpoints], {
          headers: {
            'User-Agent': 'Space-Weather-Dashboard/1.0'
          }
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch ${type} events: ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        return data.map((event: any) => ({
          ...event,
          eventType: type,
          eventID: event.flrID || event.cmeID || event.sepID || event.ipsID || event.mpcID || event.gstID || event.rbeID || `${type}-${Date.now()}-${Math.random()}`
        }));
      } catch (error) {
        console.warn(`Error fetching ${type} events:`, error);
        return [];
      }
    });

    const eventResults = await Promise.all(eventPromises);
    let allEvents = eventResults.flat();

    // If DONKI fails (likely due to rate limiting), try to get data from NOAA SWPC
    if (allEvents.length === 0) {
      console.log('DONKI API returned no data, trying NOAA SWPC...');
      const noaaFlares = await fetchNOAAFlares(startDate, endDate);
      if (noaaFlares.length > 0) {
        return NextResponse.json({
          success: true,
          data: noaaFlares,
          source: 'noaa_swpc',
          dateRange: {
            start: startDateStr,
            end: endDateStr
          }
        });
      }
    }

    // If no real data is available, generate mock data with current dates
    if (allEvents.length === 0) {
      const now = new Date();
      const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      
      return NextResponse.json({
        success: true,
        data: [
          {
            eventID: `${day1.toISOString()}-FLR-001`,
            eventType: 'FLR',
            beginTime: day1.toISOString(),
            endTime: new Date(day1.getTime() + 30 * 60 * 1000).toISOString(),
            peakTime: new Date(day1.getTime() + 15 * 60 * 1000).toISOString(),
            sourceLocation: 'S15E35',
            activeRegionNum: 13884,
            classType: 'B1.6',
            instruments: [{ displayName: 'GOES-16: EXIS 1.0-8.0' }],
            linkedEvents: [
              { activityID: `${new Date(day1.getTime() + 27 * 60 * 1000).toISOString()}-CME-001`, eventType: 'CME' },
              { activityID: `${new Date(day1.getTime() + 200 * 60 * 1000).toISOString()}-SEP-001`, eventType: 'SEP' }
            ],
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/28953/-1'
          },
          {
            eventID: `${new Date(day1.getTime() + 27 * 60 * 1000).toISOString()}-CME-001`,
            eventType: 'CME',
            beginTime: new Date(day1.getTime() + 27 * 60 * 1000).toISOString(),
            sourceLocation: 'S15E35',
            activeRegionNum: 13884,
            speed: 450,
            halfAngle: 30,
            catalog: 'M2M_CATALOG',
            instruments: [{ displayName: 'SOHO: LASCO/C2' }],
            linkedEvents: [
              { activityID: `${day1.toISOString()}-FLR-001`, eventType: 'FLR' }
            ],
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/28954/-1'
          },
          {
            eventID: `${day2.toISOString()}-FLR-002`,
            eventType: 'FLR',
            beginTime: day2.toISOString(),
            endTime: new Date(day2.getTime() + 40 * 60 * 1000).toISOString(),
            peakTime: new Date(day2.getTime() + 15 * 60 * 1000).toISOString(),
            sourceLocation: 'N20W45',
            activeRegionNum: 13885,
            classType: 'C3.4',
            instruments: [{ displayName: 'GOES-18: EXIS 1.0-8.0' }],
            linkedEvents: [],
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/28957/-1'
          },
          {
            eventID: `${now.toISOString()}-GST-001`,
            eventType: 'GST',
            beginTime: now.toISOString(),
            kpIndex: 4,
            instruments: [{ displayName: 'Ground Magnetometers' }],
            linkedEvents: [],
            link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/GST/28958/-1'
          }
        ],
        source: 'mock',
        dateRange: {
          start: startDateStr,
          end: endDateStr
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: allEvents,
      source: 'nasa_donki',
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    });

  } catch (error) {
    console.error('Error fetching DONKI events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch space weather events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}