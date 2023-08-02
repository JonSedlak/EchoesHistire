import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../hooks';
import Text from '../components/Text';
import axios from 'axios';
import { GALLERIES } from '../constants/mocks';
import { COLORS } from '../constants/light';

type Props = {
  route: {
    params: {
      id: number;
      latitude: number;
      longitude: number;
    };
  };
};

interface Step {
  distance: string;
  duration: string;
  instructions: string;
  polyline: string;
}

const overlaySize = 300;

const ARMap = ({ route }: Props) => {
  const { id, latitude, longitude } = route.params;
  const { colors } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Find the gallery with the matching id
  const gallery = GALLERIES.find((gallery) => gallery.id === id);

  const openArLink = () => {
    if (gallery && gallery.arLink) {
      Linking.openURL(gallery.arLink);
    } else {
      console.log('Gallery not found or missing arLink.');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (location) {
        updateCurrentLocation();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [location]);

  const updateCurrentLocation = async () => {
    let currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation);
  }; 
  
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const getDirections = () => {
    if (location) {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${latitude},${longitude}`;
      const apiKey = 'AIzaSyCn8voDgWTZb9QyZjtFn2McLWCnYTr5xFw'; // Replace with your Google Maps API key
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=walking&key=${apiKey}`;

      axios
        .get(url)
        .then((response) => {
          const route = response.data.routes[0];
          const legs = route.legs;
          const steps = legs.flatMap((leg: any) =>
            leg.steps.map((step: any) => ({
              distance: step.distance.text,
              duration: step.duration.text,
              instructions: step.html_instructions.replace(/<[^>]+>/g, ''),
              polyline: step.polyline.points,
            }))
          );
          setSteps(steps);
        })
        .catch((error) => {
          console.log('Error fetching directions:', error);
        });
    }
  };

  if (!location) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!mapLoaded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onMapReady={() => setMapLoaded(true)}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
        />
        <Marker
          coordinate={{
            latitude: latitude,
            longitude: longitude,
          }}
        />
        <Polyline
          coordinates={steps.flatMap((step) => decodePolyline(step.polyline))}
          strokeColor={colors.primary}
          strokeWidth={3}
        />
      </MapView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.imHereButton]}
          onPress={openArLink} // Use the openArLink function to open the correct arLink
        >
          <Text h5 color={colors.white} semibold>
            I'm Here!
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={getDirections}
        >
          <Text h5 color={colors.white} semibold>
            Get Directions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imHereButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0, 30, 68, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0, 30, 68, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  cameraCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCloseButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  overlayContainer: {
    position: 'absolute',
    width: overlaySize,
    height: overlaySize,
  },
  setPositionButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: 'rgba(0, 30, 68, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPositionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
});

export default ARMap; 