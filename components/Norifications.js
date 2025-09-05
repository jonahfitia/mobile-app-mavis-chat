import messaging from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

async function configureNotifications(userId) {
    const navigation = useNavigation();

    // Demander les permissions
    let enabled = false;
    if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } else if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (!enabled) {
        console.log('Permission refusée');
        return;
    }

    // Obtenir le token FCM
    const token = await messaging().getToken();
    console.log('Token FCM:', token);

    // Envoyer le token à Odoo
    await fetch(`${CONFIG.SERVER_URL}/api/register_fcm_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, fcm_token: token }),
    });

    // Gérer les notifications reçues en avant-plan
    messaging().onMessage(async (remoteMessage) => {
        console.log('Notification reçue:', remoteMessage);
    });

    // Gérer les notifications en arrière-plan
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Notification en arrière-plan:', remoteMessage);
    });

    // Gérer les clics sur les notifications
    messaging().onNotificationOpenedApp((remoteMessage) => {
        const channelId = remoteMessage.data.channel_id;
        if (channelId) {
            navigation.navigate('ChatScreen', { channelId });
        }
    });

    // Gérer les notifications ouvrant l'application depuis un état fermé
    messaging().getInitialNotification().then((remoteMessage) => {
        if (remoteMessage) {
            const channelId = remoteMessage.data.channel_id;
            if (channelId) {
                navigation.navigate('ChatScreen', { channelId });
            }
        }
    });
}

export default function Notifications({ userId }) {
    useEffect(() => {
        configureNotifications(userId);
    }, [userId]);
    return null;
}