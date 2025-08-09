import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { auntyOutfitRoast } from '../lib/llm';
import { detectOutfit } from '../lib/vision';

type AddressAs = 'neutral' | 'male' | 'female';

export default function OutfitJudgeScreen() {
  const navigation = useNavigation();
  const [image, setImage] = useState<string | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addressAs, setAddressAs] = useState<AddressAs>('neutral');

  const canUseCamera = Platform.OS !== 'web';

  const pickImage = useCallback(async () => {
    setRoast(null);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setImage(res.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (!canUseCamera) return;
    setRoast(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      setImage(res.assets[0].uri);
    }
  }, [canUseCamera]);

  const analyze = useCallback(async () => {
    if (!image) return;
    setBusy(true);
    setRoast(null);
    try {
      const detected = await detectOutfit(image);
      const reply = await auntyOutfitRoast({ addressAs, items: detected.items });
      setRoast(reply.trim());
    } catch (e) {
      setRoast('Aiyyo image analyse cheyyan pattiyilla. Try again, chetta/chechi.');
    } finally {
      setBusy(false);
    }
  }, [image, addressAs]);

  const showActions = useMemo(() => !!image, [image]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Omana aunty Outfit Judge</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home' as never)}>
          <Text style={styles.headerAction}>Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {image ? (
          <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}> 
            <Text style={styles.placeholderText}>Pick or snap your outfit</Text>
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Pick from Library</Text>
          </TouchableOpacity>
          {canUseCamera && (
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.buttonText}>Open Camera</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segment}>
          <Text style={styles.segmentLabel}>Address me as</Text>
          <View style={styles.segmentRow}>
            {(['neutral', 'male', 'female'] as AddressAs[]).map((opt) => (
              <TouchableOpacity key={opt} onPress={() => setAddressAs(opt)} style={[styles.segmentBtn, addressAs === opt && styles.segmentBtnActive]}>
                <Text style={[styles.segmentText, addressAs === opt && styles.segmentTextActive]}>
                  {opt === 'neutral' ? 'Neutral (mone/mole)' : opt === 'male' ? 'Male (chetta)' : 'Female (chechi)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showActions && (
          <TouchableOpacity style={[styles.analyzeBtn, busy && { opacity: 0.6 }]} onPress={analyze} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeText}>Ask Omana aunty</Text>}
          </TouchableOpacity>
        )}

        {roast && (
          <View style={styles.roastBox}>
            <Text style={styles.roastText}>{roast}</Text>
          </View>
        )}

        <Text style={styles.note}>Note: We only detect clothing items. We don't infer sensitive attributes from images. You control how aunty addresses you.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerAction: { color: '#2563eb', fontWeight: '600' },
  body: { flex: 1, padding: 16, gap: 12 },
  placeholder: {
    height: 320,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  placeholderText: { color: '#6b7280' },
  preview: { width: '100%', height: 320, borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  analyzeBtn: { marginTop: 4, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  analyzeText: { color: 'white', fontWeight: '700' },
  roastBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  roastText: { fontSize: 16, lineHeight: 22, color: '#111827' },
  segment: { marginTop: 8 },
  segmentLabel: { marginBottom: 6, color: '#6b7280' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#111827' },
  segmentText: { color: '#374151', fontWeight: '700' },
  segmentTextActive: { color: 'white' },
  note: { marginTop: 8, color: '#6b7280', fontSize: 12 },
});