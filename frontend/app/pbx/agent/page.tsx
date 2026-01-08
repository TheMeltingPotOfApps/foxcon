'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Pause,
  Mic,
  MicOff,
  Users,
  Clock,
  X,
} from 'lucide-react';
import { usePbxWebSocket } from '@/lib/hooks/use-pbx-websocket';
import {
  useAgentExtensions,
  useDialCall,
  useAnswerCall,
  useHangupCall,
  useUpdateCallNotes,
  useCallSessions,
} from '@/lib/hooks/use-pbx';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export default function AgentPage() {
  const user = useAuthStore((state) => state.user);
  const { data: agentExtensions } = useAgentExtensions();
  const agentExtension = agentExtensions?.find((ext: any) => ext.userId === user?.id);
  
  const {
    socket,
    isConnected,
    incomingCall,
    setIncomingCall,
    answerCall,
    hangupCall,
    dialCall,
    updateStatus,
    login,
  } = usePbxWebSocket();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [callNotes, setCallNotes] = useState('');
  const [disposition, setDisposition] = useState('');
  const [agentStatus, setAgentStatus] = useState('OFFLINE');
  const [callTimer, setCallTimer] = useState(0);

  const dialMutation = useDialCall();
  const answerMutation = useAnswerCall();
  const hangupMutation = useHangupCall();
  const updateNotesMutation = useUpdateCallNotes();

  useEffect(() => {
    if (agentExtension && socket && isConnected) {
      login(agentExtension.extension);
      setAgentStatus('AVAILABLE');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentExtension, socket, isConnected]);

  useEffect(() => {
    if (incomingCall) {
      // Show notification
      toast.info('Incoming call', {
        description: `From: ${incomingCall.from}`,
        duration: 30000,
      });
    }
  }, [incomingCall]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCall) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async () => {
    if (!incomingCall || !user?.id) return;
    try {
      await answerMutation.mutateAsync(incomingCall.callSessionId);
      setCurrentCall(incomingCall);
      setIncomingCall(null);
      toast.success('Call answered');
    } catch (error: any) {
      toast.error(error.message || 'Failed to answer call');
    }
  };

  const handleHangup = async () => {
    if (!currentCall || !user?.id) return;
    try {
      await hangupMutation.mutateAsync(currentCall.callSessionId);
      setCurrentCall(null);
      setCallNotes('');
      setDisposition('');
      toast.success('Call ended');
    } catch (error: any) {
      toast.error(error.message || 'Failed to hangup call');
    }
  };

  const handleDial = async () => {
    if (!phoneNumber || !user?.id) {
      if (!phoneNumber) toast.error('Please enter a phone number');
      return;
    }
    try {
      const result = await dialMutation.mutateAsync({ phoneNumber });
      setCurrentCall(result.callSession);
      toast.success('Call initiated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to dial');
    }
  };

  const handleSaveNotes = async () => {
    if (!currentCall) return;
    try {
      await updateNotesMutation.mutateAsync({
        callId: currentCall.id,
        notes: callNotes,
        disposition,
      });
      toast.success('Notes saved');
    } catch (error: any) {
      toast.error('Failed to save notes');
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setAgentStatus(newStatus);
    updateStatus(newStatus);
    toast.success(`Status changed to ${newStatus}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Portal</h1>
          <p className="text-muted-foreground">
            Extension: {agentExtension?.extension || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={isConnected ? 'default' : 'destructive'}
            className="flex items-center gap-2"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Select
            value={agentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-40"
          >
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="AWAY">Away</option>
            <option value="OFFLINE">Offline</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Softphone Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Call Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Incoming Call Notification */}
            {incomingCall && !currentCall && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-primary text-primary-foreground p-6 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Incoming Call</p>
                    <p className="text-2xl font-bold">{incomingCall.from}</p>
                  </div>
                  <PhoneIncoming className="w-8 h-8 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAnswer}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Answer
                  </Button>
                  <Button
                    onClick={() => setIncomingCall(null)}
                    variant="secondary"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Active Call Display */}
            {currentCall && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-muted p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">On Call</p>
                      <p className="text-2xl font-bold">
                        {currentCall.contact?.firstName
                          ? `${currentCall.contact.firstName} ${currentCall.contact.lastName || ''}`
                          : currentCall.callLog?.to || 'Unknown'}
                      </p>
                      <p className="text-muted-foreground">
                        {currentCall.callLog?.to || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-lg font-mono">
                        <Clock className="w-4 h-4" />
                        {formatTime(callTimer)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleHangup}
                      variant="destructive"
                      className="flex-1"
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Hang Up
                    </Button>
                    <Button variant="outline">
                      <Pause className="w-4 h-4 mr-2" />
                      Hold
                    </Button>
                    <Button variant="outline">
                      <Mic className="w-4 h-4 mr-2" />
                      Mute
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Dial Pad */}
            {!currentCall && !incomingCall && (
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleDial();
                    }}
                  />
                </div>
                <Button
                  onClick={handleDial}
                  className="w-full"
                  disabled={!phoneNumber || dialMutation.isPending}
                >
                  <PhoneOutgoing className="w-4 h-4 mr-2" />
                  {dialMutation.isPending ? 'Dialing...' : 'Dial'}
                </Button>
              </div>
            )}

            {/* Call Notes */}
            {currentCall && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Call Notes
                  </label>
                  <Textarea
                    placeholder="Add notes about this call..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Disposition
                  </label>
                  <Select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                  >
                    <option value="">Select disposition</option>
                    <option value="ANSWERED">Answered</option>
                    <option value="NO_ANSWER">No Answer</option>
                    <option value="BUSY">Busy</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </div>
                <Button
                  onClick={handleSaveNotes}
                  variant="outline"
                  className="w-full"
                >
                  Save Notes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Information Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            {currentCall?.contact ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">
                    {currentCall.contact.firstName}{' '}
                    {currentCall.contact.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">
                    {currentCall.contact.phoneNumber}
                  </p>
                </div>
                {currentCall.contact.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{currentCall.contact.email}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No lead information available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

