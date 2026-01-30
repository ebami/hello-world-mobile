import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌍 Hello World!</Text>
      <Text style={styles.subtitle}>Welcome to React Native</Text>
      <Text style={styles.info}>This app runs on Android & iOS</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 5,
  },
  info: {
    fontSize: 14,
    color: '#718096',
    marginTop: 20,
  },
});
