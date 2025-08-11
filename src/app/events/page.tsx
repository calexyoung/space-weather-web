'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DonkiEvent {
  eventID: string;
  eventType: 'FLR' | 'CME' | 'SEP' | 'IPS' | 'MPC' | 'GST' | 'RBE';
  beginTime: string;
  endTime?: string;
  peakTime?: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  classType?: string;
  speed?: number;
  halfAngle?: number;
  catalog?: string;
  linkedEvents?: Array<{
    activityID: string;
    eventType: string;
  }>;
  instruments?: Array<{
    displayName: string;
  }>;
  note?: string;
  link?: string;
}

interface EventChain {
  rootEvent: DonkiEvent;
  linkedEvents: DonkiEvent[];
  eventCount: number;
  timeSpan: number;
  eventTypes: string[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<DonkiEvent[]>([]);
  const [eventChains, setEventChains] = useState<EventChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DonkiEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchDonkiEvents();
  }, [dateRange]);

  const fetchDonkiEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/donki/events?dateRange=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        setEvents(result.data);
        buildEventChains(result.data);
      } else {
        console.error('Failed to fetch DONKI events:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch DONKI events:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildEventChains = (events: DonkiEvent[]) => {
    const chains: EventChain[] = [];
    const processedEvents = new Set<string>();

    events.forEach(event => {
      if (processedEvents.has(event.eventID)) return;

      const chain = buildSingleChain(event, events, processedEvents);
      if (chain.linkedEvents.length > 0) {
        chains.push(chain);
      }
    });

    setEventChains(chains);
  };

  const buildSingleChain = (rootEvent: DonkiEvent, allEvents: DonkiEvent[], processedEvents: Set<string>): EventChain => {
    const linkedEvents: DonkiEvent[] = [rootEvent];
    const toProcess = [rootEvent];
    const eventIds = new Set([rootEvent.eventID]);

    while (toProcess.length > 0) {
      const currentEvent = toProcess.shift()!;
      processedEvents.add(currentEvent.eventID);

      currentEvent.linkedEvents?.forEach(linkedRef => {
        if (!eventIds.has(linkedRef.activityID)) {
          const linkedEvent = allEvents.find(e => e.eventID === linkedRef.activityID);
          if (linkedEvent) {
            linkedEvents.push(linkedEvent);
            toProcess.push(linkedEvent);
            eventIds.add(linkedEvent.eventID);
          }
        }
      });
    }

    const sortedEvents = linkedEvents.sort((a, b) => 
      new Date(a.beginTime).getTime() - new Date(b.beginTime).getTime()
    );

    const timeSpan = sortedEvents.length > 1 ? 
      (new Date(sortedEvents[sortedEvents.length - 1].beginTime).getTime() - 
       new Date(sortedEvents[0].beginTime).getTime()) / (1000 * 60 * 60) : 0;

    return {
      rootEvent,
      linkedEvents: sortedEvents,
      eventCount: sortedEvents.length,
      timeSpan,
      eventTypes: [...new Set(sortedEvents.map(e => e.eventType))]
    };
  };

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      'FLR': 'bg-red-100 text-red-800',
      'CME': 'bg-blue-100 text-blue-800',
      'SEP': 'bg-yellow-100 text-yellow-800',
      'IPS': 'bg-green-100 text-green-800',
      'GST': 'bg-purple-100 text-purple-800',
      'MPC': 'bg-indigo-100 text-indigo-800',
      'RBE': 'bg-orange-100 text-orange-800'
    };
    return colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getFlareClassColor = (classType: string) => {
    if (classType?.startsWith('X')) return 'bg-red-600 text-white';
    if (classType?.startsWith('M')) return 'bg-orange-500 text-white';
    if (classType?.startsWith('C')) return 'bg-yellow-500 text-black';
    return 'bg-gray-400 text-white';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const generatePEARSReport = async (eventChain: EventChain) => {
    try {
      const response = await fetch('/api/reports/event-chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventChain,
          analyst: 'Space Weather Dashboard',
          format: 'markdown'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Create a blob and download the report
        const blob = new Blob([result.report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PEARS_EventChain_${eventChain.rootEvent.eventID.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to generate PEARS report:', result.error);
        alert('Failed to generate PEARS report. Please try again.');
      }
    } catch (error) {
      console.error('Error generating PEARS report:', error);
      alert('Error generating PEARS report. Please try again.');
    }
  };

  const filteredEvents = events.filter(event =>
    event.eventID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.classType && event.classType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Space Weather Events</h1>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Space Weather Events</h1>
          <div className="flex gap-2">
            {['24h', '3d', '7d', '30d'].map(range => (
              <Button
                key={range}
                variant={dateRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search events by ID, type, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Tabs defaultValue="events" className="w-full">
          <TabsList>
            <TabsTrigger value="events">All Events</TabsTrigger>
            <TabsTrigger value="chains">Event Chains</TabsTrigger>
            <TabsTrigger value="flares">Solar Flares</TabsTrigger>
            <TabsTrigger value="cmes">CMEs</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <div className="grid gap-4">
              {filteredEvents.map(event => (
                <Card key={event.eventID} className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedEvent(event)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-mono">
                          {event.eventID}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(event.beginTime)}
                          {event.endTime && ` - ${formatDate(event.endTime)}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getEventTypeColor(event.eventType)}>
                          {event.eventType}
                        </Badge>
                        {event.classType && (
                          <Badge className={getFlareClassColor(event.classType)}>
                            {event.classType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {event.sourceLocation && (
                        <div>
                          <span className="font-medium">Location:</span> {event.sourceLocation}
                        </div>
                      )}
                      {event.activeRegionNum && (
                        <div>
                          <span className="font-medium">Active Region:</span> {event.activeRegionNum}
                        </div>
                      )}
                      {event.speed && (
                        <div>
                          <span className="font-medium">Speed:</span> {event.speed} km/s
                        </div>
                      )}
                      {event.linkedEvents && event.linkedEvents.length > 0 && (
                        <div>
                          <span className="font-medium">Linked Events:</span> {event.linkedEvents.length}
                        </div>
                      )}
                    </div>
                    {event.link && (
                      <div className="mt-3">
                        <a 
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View in DONKI →
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chains" className="space-y-4">
            {eventChains.map((chain, index) => (
              <Card key={`chain-${index}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Event Chain {index + 1}
                        <Badge variant="outline">
                          {chain.eventCount} events
                        </Badge>
                        <Badge variant="outline">
                          {chain.timeSpan.toFixed(1)}h span
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Event Types: {chain.eventTypes.join(', ')}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generatePEARSReport(chain)}
                    >
                      Generate PEARS Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {chain.linkedEvents.map((event, idx) => (
                      <div key={event.eventID} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-mono text-sm">{event.eventID}</div>
                          <div className="text-xs text-gray-600">{formatDate(event.beginTime)}</div>
                        </div>
                        <Badge className={getEventTypeColor(event.eventType)}>
                          {event.eventType}
                        </Badge>
                        {event.classType && (
                          <Badge className={getFlareClassColor(event.classType)}>
                            {event.classType}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="flares" className="space-y-4">
            <div className="grid gap-4">
              {filteredEvents.filter(e => e.eventType === 'FLR').map(event => (
                <Card key={event.eventID}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-mono text-lg">{event.eventID}</CardTitle>
                        <CardDescription>{formatDate(event.beginTime)}</CardDescription>
                      </div>
                      <Badge className={getFlareClassColor(event.classType || '')}>
                        {event.classType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div><span className="font-medium">Peak:</span> {event.peakTime ? formatDate(event.peakTime) : 'N/A'}</div>
                      <div><span className="font-medium">Location:</span> {event.sourceLocation || 'N/A'}</div>
                      <div><span className="font-medium">Active Region:</span> {event.activeRegionNum || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cmes" className="space-y-4">
            <div className="grid gap-4">
              {filteredEvents.filter(e => e.eventType === 'CME').map(event => (
                <Card key={event.eventID}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-mono text-lg">{event.eventID}</CardTitle>
                        <CardDescription>{formatDate(event.beginTime)}</CardDescription>
                      </div>
                      <Badge className={getEventTypeColor('CME')}>
                        CME
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="font-medium">Speed:</span> {event.speed || 'N/A'} km/s</div>
                      <div><span className="font-medium">Half-Angle:</span> {event.halfAngle || 'N/A'}°</div>
                      <div><span className="font-medium">Location:</span> {event.sourceLocation || 'N/A'}</div>
                      <div><span className="font-medium">Catalog:</span> {event.catalog || 'N/A'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
               onClick={() => setSelectedEvent(null)}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-mono">{selectedEvent.eventID}</CardTitle>
                    <CardDescription>{formatDate(selectedEvent.beginTime)}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Event Type:</span> {selectedEvent.eventType}</div>
                  <div><span className="font-medium">Begin Time:</span> {formatDate(selectedEvent.beginTime)}</div>
                  {selectedEvent.endTime && (
                    <div><span className="font-medium">End Time:</span> {formatDate(selectedEvent.endTime)}</div>
                  )}
                  {selectedEvent.peakTime && (
                    <div><span className="font-medium">Peak Time:</span> {formatDate(selectedEvent.peakTime)}</div>
                  )}
                  {selectedEvent.classType && (
                    <div><span className="font-medium">Class:</span> {selectedEvent.classType}</div>
                  )}
                  {selectedEvent.sourceLocation && (
                    <div><span className="font-medium">Source Location:</span> {selectedEvent.sourceLocation}</div>
                  )}
                  {selectedEvent.activeRegionNum && (
                    <div><span className="font-medium">Active Region:</span> {selectedEvent.activeRegionNum}</div>
                  )}
                  {selectedEvent.speed && (
                    <div><span className="font-medium">Speed:</span> {selectedEvent.speed} km/s</div>
                  )}
                </div>

                {selectedEvent.linkedEvents && selectedEvent.linkedEvents.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Linked Events:</h3>
                    <div className="space-y-2">
                      {selectedEvent.linkedEvents.map(linked => (
                        <div key={linked.activityID} className="p-2 bg-gray-50 rounded">
                          <div className="font-mono text-sm">{linked.activityID}</div>
                          <Badge className={getEventTypeColor(linked.eventType)} size="sm">
                            {linked.eventType}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.instruments && selectedEvent.instruments.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Instruments:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.instruments.map((instrument, idx) => (
                        <Badge key={idx} variant="outline">
                          {instrument.displayName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.link && (
                  <div>
                    <a
                      href={selectedEvent.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                      View in DONKI →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}