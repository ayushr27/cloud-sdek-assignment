'use client';
import { useEffect, useRef } from 'react';
import { useAssignmentStore } from '@/store/assignmentStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export function useAssignmentSocket(assignmentId: string | null) {
  const { setJobStatus, setJobError } = useAssignmentStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Only connect if we have a user to identify the WS stream
    if (!user) return;

    // Derive WS URL from API URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const WS_URL = API_URL.replace('http', 'ws').replace('/api', '');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', userId: user.id }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: evName, data } = payload;

        if (evName === 'job:queued') {
          setJobStatus('queued', 'In Queue', null);
        } else if (evName === 'job:progress') {
          setJobStatus('generating', data.stage, data.model);
        } else if (evName === 'job:complete') {
          setJobStatus('done', 'Completed', null);
          if (data.paperId) {
            router.push(`/assignments/${data.paperId}`);
          }
        } else if (evName === 'job:failed') {
          setJobError(data.reason || 'Generation failed');
        }
      } catch (err) {
        console.error('WS Parse Error', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [user, setJobStatus, setJobError, router]);
}
