import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/utils/toastHelper';
import { useSupabaseAuth } from './useSupabaseAuth';

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  link?: string;
}

export function useRealtimeNotifications() {
  const { user } = useSupabaseAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Carregar notificações existentes
    loadNotifications();

    // Escutar novas notificações em tempo real
    const channel = supabase
      .channel('notificacoes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleNewNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const mappedNotifications: RealtimeNotification[] = data.map(notif => ({
          id: notif.id,
          title: notif.titulo,
          message: notif.mensagem,
          type: mapTipoToType(notif.tipo),
          timestamp: notif.created_at,
          read: notif.lida,
          link: notif.link,
        }));

        setNotifications(mappedNotifications);
        setUnreadCount(mappedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const mapTipoToType = (tipo: string): 'critical' | 'warning' | 'info' => {
    if (tipo === 'email_pendente') return 'warning';
    if (tipo === 'critical') return 'critical';
    return 'info';
  };

  const handleNewNotification = (notif: any) => {
    const notification: RealtimeNotification = {
      id: notif.id,
      title: notif.titulo,
      message: notif.mensagem,
      type: mapTipoToType(notif.tipo),
      timestamp: notif.created_at,
      read: false,
      link: notif.link,
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Mostrar toast
    const toastConfig = {
      description: notification.message,
      duration: 5000,
    };

    if (notification.type === 'critical') {
      toast.error(notification.title, toastConfig);
    } else if (notification.type === 'warning') {
      toast.warning(notification.title, toastConfig);
    } else {
      toast.info(notification.title, toastConfig);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_id', user.id)
        .eq('lida', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
