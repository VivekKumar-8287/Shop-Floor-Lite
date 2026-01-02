import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';

interface PhotoUploaderProps {
  onPhotoTaken: (uri: string | null) => void;
  maxSizeKB?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotoTaken,
  maxSizeKB = 200,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const compressImage = async (uri: string): Promise<string> => {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (fileInfo.exists && fileInfo.size) {
      const sizeKB = fileInfo.size / 1024;
      
      if (sizeKB <= maxSizeKB) {
        return uri;
      }

      // Simple compression by reducing quality
      //@ts-ignore
      const compressedUri = FileSystem.documentDirectory + 'compressed.jpg';
      // In a real app, you would use a proper compression library
      // For now, we'll just return the original
      return uri;
    }
    
    return uri;
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take photos');
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setPhotoUri(compressedUri);
        onPhotoTaken(compressedUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const chooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library permission is required');
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setPhotoUri(compressedUri);
        onPhotoTaken(compressedUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
    onPhotoTaken(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Processing photo...</Text>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.photoContainer}>
        <Image source={{ uri: photoUri }} style={styles.photo} />
        <TouchableOpacity style={styles.removeButton} onPress={removePhoto}>
          <MaterialIcons name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={takePhoto}>
        <MaterialIcons name="photo-camera" size={24} color="#007AFF" />
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={chooseFromLibrary}>
        <MaterialIcons name="photo-library" size={24} color="#007AFF" />
        <Text style={styles.buttonText}>Choose from Library</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 4,
  },
});