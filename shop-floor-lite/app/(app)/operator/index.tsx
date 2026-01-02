import { View, Text, StyleSheet, Button } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';


export default function OperatorDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);

    // Redirect if user is not operator
  if (!user || user.role !== 'operator') {
    return <Redirect href="/(app)" />;
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Operator Dashboard</Text>
      <Text>Welcome, {user?.email}</Text>
      
      <View style={styles.section}>
        <Link href="/(app)/operator/downtime" style={styles.link}>
          <Text>Record Downtime</Text>
        </Link>
        <Link href="/(app)/operator/checklist" style={styles.link}>
          <Text>Maintenance Checklist</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { marginTop: 30 },
  link: { marginBottom: 15, color: '#007AFF' }
});