import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { MaintenanceAlert, MaintenanceRule } from '../types';
import { useRefuelLogs } from './useRefuelLogs';
import { useSettings } from './useSettings';
import { calculateMaintenanceAlerts, maintenanceRulesFromVehicles } from '../utils/maintenance';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const lastEvaluation = ref(Date.now());
const NOTIFICATION_KEY_PREFIX = 'llenoporfa_maintenance_scheduled_';

function notificationId(ruleId: string, suffix = 'due'): number {
  return Math.max(1, Math.abs([...`${ruleId}:${suffix}`].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)));
}

export function useMaintenance() {
  const { vehicles, updateVehicle } = useSettings();
  const { logs } = useRefuelLogs();
  const now = computed(() => new Date(lastEvaluation.value));
  const rules = computed(() => maintenanceRulesFromVehicles(vehicles.value));
  const alerts = computed(() => calculateMaintenanceAlerts(rules.value, vehicles.value, logs.value, now.value));
  const activeAlerts = computed(() => alerts.value.filter((alert) => alert.status !== 'upcoming'));

  const cancelScheduledNotification = async (ruleId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId(ruleId) }] });
    } catch (error) {
      console.warn('No se pudo cancelar el aviso de mantenimiento', error);
    }
    if (typeof window !== 'undefined') localStorage.removeItem(`${NOTIFICATION_KEY_PREFIX}${ruleId}`);
  };

  const scheduleFutureNotification = async (ruleId: string, force = false) => {
    if (!Capacitor.isNativePlatform() || typeof window === 'undefined') return;
    const alert = alerts.value.find((item) => item.rule.id === ruleId);
    const dueDate = alert?.dueDate ? new Date(alert.dueDate) : null;
    if (!alert || !dueDate || Number.isNaN(dueDate.getTime()) || dueDate.getTime() <= Date.now()) {
      await cancelScheduledNotification(ruleId);
      return;
    }
    const key = `${NOTIFICATION_KEY_PREFIX}${ruleId}`;
    if (!force && localStorage.getItem(key) === alert.dueDate) return;

    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return;
      await LocalNotifications.cancel({ notifications: [{ id: notificationId(ruleId) }] });
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId(ruleId),
          title: `Mantenimiento: ${alert.title}`,
          body: 'Ha llegado la fecha indicada.',
          schedule: { at: dueDate },
          extra: { type: 'maintenance', ruleId },
        }],
      });
      localStorage.setItem(key, alert.dueDate!);
    } catch (error) {
      console.warn('No se pudo programar el aviso futuro de mantenimiento', error);
    }
  };

  const evaluate = (scheduleFuture = true) => {
    lastEvaluation.value = Date.now();
    notify(alerts.value.filter((alert) => alert.status !== 'upcoming'));
    if (scheduleFuture) {
      alerts.value.forEach((alert) => void scheduleFutureNotification(alert.rule.id));
    }
    return alerts.value;
  };
  const notify = async (pending: MaintenanceAlert[]) => {
    if (!pending.length || typeof window === 'undefined') return;
    const alert = pending[0];
    const key = `llenoporfa_maintenance_notified_${alert.rule.id}_${alert.status}`;
    if (localStorage.getItem(key)) return;
    const title = `Mantenimiento: ${alert.title}`;
    const body = alert.reason === 'km' ? 'Ha llegado el kilometraje indicado.' : 'Ha llegado la fecha indicada.';
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display === 'granted') {
           const id = notificationId(alert.rule.id, 'now');
           await LocalNotifications.cancel({ notifications: [{ id }] });
           await LocalNotifications.schedule({ notifications: [{ id, title, body, extra: { type: 'maintenance', ruleId: alert.rule.id } }] });
           localStorage.setItem(key, new Date().toISOString());
         }
       } else if ('Notification' in window && Notification.permission === 'granted') {
         new Notification(title, { body });
         localStorage.setItem(key, new Date().toISOString());
      }
    } catch (error) {
      console.warn('No se pudo programar el aviso de mantenimiento', error);
    }
  };
  const saveRule = (rule: MaintenanceRule) => {
    const vehicle = vehicles.value.find((item) => item.id === rule.vehicleId);
    if (!vehicle) return;
    const list = vehicle.maintenanceRules || [];
    const next = list.some((item) => item.id === rule.id) ? list.map((item) => (item.id === rule.id ? rule : item)) : [...list, rule];
    updateVehicle(vehicle.id, { maintenanceRules: next });
    evaluate(false);
    void scheduleFutureNotification(rule.id, true);
  };
  const deleteRule = (rule: MaintenanceRule) => {
    const vehicle = vehicles.value.find((item) => item.id === rule.vehicleId);
    if (vehicle) updateVehicle(vehicle.id, { maintenanceRules: (vehicle.maintenanceRules || []).filter((item) => item.id !== rule.id) });
    evaluate(false);
    void cancelScheduledNotification(rule.id);
  };
  const completeRule = (rule: MaintenanceRule) => {
    const currentKm = alerts.value.find((alert) => alert.rule.id === rule.id)?.currentOdometerKm;
    saveRule({ ...rule, startDate: new Date().toISOString(), startOdometerKm: currentKm ?? rule.startOdometerKm, completedAt: new Date().toISOString(), completedOdometerKm: currentKm, snoozedUntil: undefined });
  };
  const snoozeRule = (rule: MaintenanceRule, days = 7) => saveRule({ ...rule, snoozedUntil: new Date(Date.now() + days * 86400000).toISOString() });

  const handleFocus = () => evaluate();
  onMounted(() => {
    evaluate();
    window.addEventListener('focus', handleFocus);
  });
  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('focus', handleFocus);
  });
  return { rules, alerts, activeAlerts, evaluate, saveRule, deleteRule, completeRule, snoozeRule };
}
