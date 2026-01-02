import { View, Text, StyleSheet } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/index';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';


export default function SupervisorDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { signOut } = useAuth();

 

  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.role} Dashboard</Text>
      <Text>Welcome, {user?.email}</Text>
      
      <View style={styles.section}>
        <Link href="/(app)/supervisor/alerts" style={styles.link}>
          <Text>View Alerts</Text>
        </Link>
        <Link href="/(app)" style={styles.link}>
          <Text>Back to Main Dashboard</Text>
        </Link>
      </View>
      <Button
  title="Logout"
  onPress={signOut}
  variant="outline"
  style={{ marginTop: 20 }}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textTransform:'capitalize' },
  section: { marginTop: 30 },
  link: { marginBottom: 15, color: '#007AFF' }
});