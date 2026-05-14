import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createIssueRequest } from '../../services/api';

const CATEGORIES = ['Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Other'];

const emptyErrors = () => ({
  issueTitle: '',
  description: '',
  category: '',
  building: '',
  floor: '',
  room: '',
  image: '',
});

export default function SubmitIssueScreen({ navigation }) {
  // Use issueTitle (not "title") to avoid collisions with navigation/header naming on some platforms.
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  /** Local file URI from the picker (demo: sent as image_url as-is; replace with cloud URL in production). */
  const [localImageUri, setLocalImageUri] = useState(null);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [errors, setErrors] = useState(emptyErrors());
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = emptyErrors();
    let ok = true;

    if (!description.trim()) {
      next.description = 'Description is required.';
      ok = false;
    }
    if (!category) {
      next.category = 'Please choose a category.';
      ok = false;
    }
    if (!building.trim()) {
      next.building = 'Building / location is required.';
      ok = false;
    }

    setErrors(next);
    return ok;
  }

  async function pickImage() {
    setErrors((e) => ({ ...e, image: '' }));
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrors((e) => ({
        ...e,
        image: 'Photo library permission is required to attach an image.',
      }));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setLocalImageUri(asset.uri);
    } catch {
      setErrors((e) => ({
        ...e,
        image: 'Could not open the photo library. Please try again.',
      }));
    }
  }

  function clearImage() {
    setLocalImageUri(null);
    setErrors((e) => ({ ...e, image: '' }));
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setErrors(emptyErrors());

    // Demo: send the picker's file URI directly. Backend stores the string; swap for HTTPS after cloud upload.
    const image_url = localImageUri || undefined;

    try {
      await createIssueRequest({
        title: issueTitle.trim() || undefined,
        description: description.trim(),
        category,
        building: building.trim(),
        floor: floor.trim() || undefined,
        room: room.trim() || undefined,
        image_url,
      });

      Alert.alert('Submitted', 'Your issue was submitted successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);

      setIssueTitle('');
      setDescription('');
      setCategory('');
      setBuilding('');
      setFloor('');
      setRoom('');
      clearImage();
    } catch (e) {
      const detail =
        e?.data?.errors && Array.isArray(e.data.errors)
          ? e.data.errors.join('\n')
          : e.message || 'Something went wrong.';
      Alert.alert('Could not submit', detail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Report a maintenance issue. Required fields are marked below.
        </Text>

        <Text style={styles.label}>Title (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Short summary"
          placeholderTextColor="#888"
          value={issueTitle}
          editable={!submitting}
          autoCorrect
          autoCapitalize="sentences"
          autoComplete="off"
          textContentType="none"
          {...(Platform.OS === 'android' ? { importantForAutofill: 'no' } : {})}
          onChangeText={(t) => {
            setIssueTitle(t);
            if (errors.issueTitle) setErrors((x) => ({ ...x, issueTitle: '' }));
          }}
        />
        {errors.issueTitle ? <Text style={styles.err}>{errors.issueTitle}</Text> : null}

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe the problem"
          placeholderTextColor="#888"
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={(t) => {
            setDescription(t);
            if (errors.description) setErrors((x) => ({ ...x, description: '' }));
          }}
        />
        {errors.description ? <Text style={styles.err}>{errors.description}</Text> : null}

        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={styles.selectTrigger}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text style={category ? styles.selectValue : styles.selectPlaceholder}>
            {category || 'Select category'}
          </Text>
        </TouchableOpacity>
        {errors.category ? <Text style={styles.err}>{errors.category}</Text> : null}

        <Text style={styles.label}>Building / location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Science Hall"
          placeholderTextColor="#888"
          value={building}
          onChangeText={(t) => {
            setBuilding(t);
            if (errors.building) setErrors((x) => ({ ...x, building: '' }));
          }}
        />
        {errors.building ? <Text style={styles.err}>{errors.building}</Text> : null}

        <Text style={styles.label}>Floor (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2"
          placeholderTextColor="#888"
          value={floor}
          onChangeText={setFloor}
        />

        <Text style={styles.label}>Room (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 204"
          placeholderTextColor="#888"
          value={room}
          onChangeText={setRoom}
        />

        <Text style={styles.label}>Photo (optional)</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
          <Text style={styles.secondaryBtnText}>
            {localImageUri ? 'Change photo' : 'Choose from library'}
          </Text>
        </TouchableOpacity>
        {localImageUri ? (
          <TouchableOpacity onPress={clearImage}>
            <Text style={styles.removePhoto}>Remove photo</Text>
          </TouchableOpacity>
        ) : null}
        {localImageUri ? (
          <Image source={{ uri: localImageUri }} style={styles.preview} />
        ) : null}
        {errors.image ? <Text style={styles.err}>{errors.image}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit issue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {categoryModalVisible ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)}>
            <Pressable style={styles.modalCard} onPress={(ev) => ev.stopPropagation()}>
              <Text style={styles.modalTitle}>Category</Text>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.modalRow}
                  onPress={() => {
                    setCategory(c);
                    setErrors((x) => ({ ...x, category: '' }));
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f6fa' },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  helper: { fontSize: 15, color: '#555', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  multiline: { minHeight: 100, paddingTop: 14 },
  selectTrigger: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectPlaceholder: { fontSize: 16, color: '#888' },
  selectValue: { fontSize: 16, color: '#1a1a2e' },
  err: { color: '#c0392b', marginBottom: 10, fontSize: 13 },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    resizeMode: 'cover',
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d6cdf',
    marginBottom: 4,
  },
  secondaryBtnText: { color: '#2d6cdf', fontWeight: '600' },
  removePhoto: { color: '#c0392b', marginBottom: 8, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2d6cdf',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1a1a2e',
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  modalRowText: { fontSize: 16, color: '#1a1a2e' },
});
