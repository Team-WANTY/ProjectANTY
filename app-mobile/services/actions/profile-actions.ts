// services/actions/profile-actions.ts
import * as ImagePicker from "expo-image-picker";
import { imagesApi } from "@/services/api/image-api";
import { profileApi } from "@/services/api/profiles-api";
import { useProfileStore } from "@/services/stores/profiles-store";
import { Alert } from "react-native";

type AvatarSource = "camera" | "library";

const AVATAR_CONTAINER_NAME = "images"; 

export async function changeAvatar(
  userId: string,
  closeModal: () => void,
  source: AvatarSource
) {
  const { setProfile, setAvatarUploading } = useProfileStore.getState();
  try {
    setAvatarUploading(true);

    // Permissions
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission was not granted.");
        return;
      }
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Media library permission was not granted.");
        return;
      }
    }

    // Launch picker
    const pickerResult =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing : true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

    if (pickerResult.canceled) {
      return; // user backed out
    }

    const asset = pickerResult.assets?.[0];
    if (!asset || !asset.uri) {
      throw new Error("No image selected.");
    }

    // Build RNFile for imagesApi.upload
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? "avatar.jpg",
      type: asset.mimeType ?? "image/jpeg",
    };

    // Upload to image service
    const uploadRes = await imagesApi.upload(
      AVATAR_CONTAINER_NAME,
      userId,
      file
    );

    if (!uploadRes.ok || !uploadRes.data) {
      throw new Error(uploadRes.message ?? "Image upload failed.");
    }

    const image = uploadRes.data; // { id, container, url, uploader_user_id }

    // Tell profile-service which image to use
    const updateRes = await profileApi.update(userId, {
      avatar_image_id: image.id, // match backend
    });

    if (!updateRes.ok) {
      // Upload succeeded but profile update failed
      throw new Error(updateRes.message ?? "Failed to update avatar.");
    }

    // Update local store with the URL so the UI refreshes
    setProfile({
      avatarUrl: image.url,
    });

    closeModal();
  } catch (err: any) {
    console.error("Error changing avatar:", err);
  } finally {
    setAvatarUploading(false);
  }
}