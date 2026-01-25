import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Laptop, Check } from 'lucide-react-native';
import { Button, Input, Card } from '@/components/ui';
import { useProjectStore } from '@/stores/project.store';
import { useDeviceStore } from '@/stores/device.store';
import { colors } from '@/theme/colors';

const languages = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'other', label: 'Other' },
];

export default function NewProjectScreen() {
  const { createProject, isLoading } = useProjectStore();
  const { devices } = useDeviceStore();

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id || '');
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [framework, setFramework] = useState('');

  const onlineDevices = devices.filter((d) => d.status === 'online' || d.status === 'syncing');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (!selectedDevice) {
      Alert.alert('Error', 'Please select a device');
      return;
    }

    try {
      const project = await createProject({
        name: name.trim(),
        path: path.trim() || `/projects/${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
        deviceId: selectedDevice,
        language: selectedLanguage,
        framework: framework.trim() || undefined,
      });

      router.replace(`/project/${project.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create project');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-900" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={24} color={colors.dark[300]} />
          <Text className="text-dark-300 ml-2">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-white text-2xl font-bold mb-2">New Project</Text>
        <Text className="text-dark-400 mb-6">
          Create a new project to start coding
        </Text>

        {/* Project Name */}
        <Input
          label="Project Name"
          placeholder="My Awesome Project"
          value={name}
          onChangeText={setName}
        />

        {/* Path */}
        <Input
          label="Project Path"
          placeholder="/path/to/project (optional)"
          value={path}
          onChangeText={setPath}
          hint="Leave empty to use default location"
        />

        {/* Device Selection */}
        <Text className="text-dark-200 font-medium mb-3">Select Device</Text>
        {onlineDevices.length === 0 ? (
          <Card padding="md" className="mb-6">
            <View className="items-center py-4">
              <Laptop size={32} color={colors.dark[600]} />
              <Text className="text-dark-400 mt-2 text-center">
                No online devices available.{'\n'}Please connect a device first.
              </Text>
              <Button
                title="Add Device"
                size="sm"
                onPress={() => router.push('/device/pair')}
                style={{ marginTop: 12 }}
              />
            </View>
          </Card>
        ) : (
          <View className="gap-3 mb-6">
            {onlineDevices.map((device) => (
              <TouchableOpacity
                key={device.id}
                onPress={() => setSelectedDevice(device.id)}
                className={`flex-row items-center p-4 rounded-xl border ${
                  selectedDevice === device.id
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-dark-800 border-dark-700'
                }`}
              >
                <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-3">
                  <Laptop size={20} color={colors.dark[300]} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{device.name}</Text>
                  <Text className="text-dark-400 text-sm capitalize">
                    {device.platform}
                  </Text>
                </View>
                {selectedDevice === device.id && (
                  <View className="w-6 h-6 bg-primary-500 rounded-full items-center justify-center">
                    <Check size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Language Selection */}
        <Text className="text-dark-200 font-medium mb-3">Language</Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.value}
              onPress={() => setSelectedLanguage(lang.value)}
              className={`px-4 py-2 rounded-lg border ${
                selectedLanguage === lang.value
                  ? 'bg-primary-500/20 border-primary-500'
                  : 'bg-dark-800 border-dark-700'
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedLanguage === lang.value ? 'text-primary-400' : 'text-dark-300'
                }`}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Framework */}
        <Input
          label="Framework (optional)"
          placeholder="e.g., React, Django, Express"
          value={framework}
          onChangeText={setFramework}
        />

        {/* Create Button */}
        <Button
          title="Create Project"
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim() || !selectedDevice}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}
