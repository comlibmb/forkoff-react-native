import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { alert } from '@/components/ui/AlertModal';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Globe, Check } from 'lucide-react-native';
import { Button, Input, Card } from '@/components/ui';
import { githubService } from '@/services/github.service';
import { colors } from '@/theme/colors';

export default function CreateRepoScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert.error('Error', 'Repository name is required');
      return;
    }

    setIsLoading(true);
    try {
      const repo = await githubService.createRepository({
        name: name.trim(),
        description: description.trim() || undefined,
        private: isPrivate,
        autoInit,
      });

      await alert.success('Success', `Repository "${repo.name}" created successfully!`);
      router.back();
    } catch (error) {
      alert.error('Error', 'Failed to create repository. Please try again.');
    } finally {
      setIsLoading(false);
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

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8">
        <Text className="text-white text-2xl font-bold mb-2">
          Create Repository
        </Text>
        <Text className="text-dark-400 mb-6">
          Create a new GitHub repository
        </Text>

        {/* Form */}
        <View className="mb-6">
          <Input
            label="Repository Name"
            placeholder="my-awesome-project"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Description (optional)"
            placeholder="A short description of your project"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Visibility */}
        <Text className="text-dark-200 font-medium mb-3">Visibility</Text>
        <View className="gap-3 mb-6">
          <Card
            padding="md"
            variant={!isPrivate ? 'elevated' : 'outlined'}
            onPress={() => setIsPrivate(false)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-3">
                <Globe size={20} color={colors.dark[300]} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Public</Text>
                <Text className="text-dark-400 text-sm">
                  Anyone can see this repository
                </Text>
              </View>
              {!isPrivate && (
                <Check size={20} color={colors.success[500]} />
              )}
            </View>
          </Card>

          <Card
            padding="md"
            variant={isPrivate ? 'elevated' : 'outlined'}
            onPress={() => setIsPrivate(true)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-dark-700 rounded-lg items-center justify-center mr-3">
                <Lock size={20} color={colors.dark[300]} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium">Private</Text>
                <Text className="text-dark-400 text-sm">
                  Only you can see this repository
                </Text>
              </View>
              {isPrivate && (
                <Check size={20} color={colors.success[500]} />
              )}
            </View>
          </Card>
        </View>

        {/* Options */}
        <Card
          padding="md"
          onPress={() => setAutoInit(!autoInit)}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white font-medium">
                Initialize with README
              </Text>
              <Text className="text-dark-400 text-sm">
                Create an initial README.md file
              </Text>
            </View>
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center ${
                autoInit
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-dark-500'
              }`}
            >
              {autoInit && <Check size={14} color="#fff" />}
            </View>
          </View>
        </Card>

        {/* Create Button */}
        <Button
          title="Create Repository"
          onPress={handleCreate}
          loading={isLoading}
          fullWidth
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
