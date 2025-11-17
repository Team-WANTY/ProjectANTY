// services/actions/avatar-update.ts
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
  const {
      avatarImageId: oldAvatarId,
      setProfile,
      setAvatarUploading,
    } = useProfileStore.getState();  
    
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
    console.log("PICKED ASSET", JSON.stringify(asset, null, 2));
    if (!asset || !asset.uri) {
      throw new Error("No image selected.");
    }

    // Update UI
    setProfile({
      userId,
      avatarUrl: asset.uri,
      // do NOT change avatarImageId yet; it's still the old one until backend confirms
    });
    console.log("UPDATING UI AVATAR...");
    closeModal();

    // Background work (upload -> patch profile -> delete old avatar)
    (async () => {
      try {
        setAvatarUploading(true);
        
        // Build RNFile for imagesApi.upload
        const file = {
          uri: asset.uri,
          name: asset.fileName ?? "avatar.jpg",
          type: asset.mimeType ?? "image/jpeg",
        };
        console.log("Calling /POST /images");
        // Upload to image service
        const uploadRes = await imagesApi.upload(
          AVATAR_CONTAINER_NAME,
          userId,
          file
        );

        if (!uploadRes.ok || !uploadRes.data) {
          throw new Error(uploadRes.message ?? "Failed to upload avatar");
        }
        console.log("Image uploaded successfully");
        
        const newImage = uploadRes.data;
        const newAvatarId: string = newImage.id;

        console.log("Calling /PATCH /profiles");
        // Update avatar_image_id in profile
        const updateRes = await profileApi.update(userId, {
          avatar_image_id: newAvatarId,
        });

        if (!updateRes.ok) {
          throw new Error(updateRes.message ?? "Failed to update profile avatar id.");
        }

        console.log("Profile updated successfully");
        // Convert avatar_image_id to avatarUrl
        let remoteUrl: string | null = null;
        try {
          const urlRes = await imagesApi.getUrl(newAvatarId);
          if (urlRes.ok) remoteUrl = urlRes.data;
        } catch (e) {
          console.warn(
            "[changeAvatar] Failed to fetch remote avatar URL",
            e
          );
        }

        console.log("Retrieved new avatarUrl from backend");
        // Update the store
        setProfile({
          userId,
          avatarImageId: newAvatarId,
          avatarUrl: remoteUrl ?? asset.uri, // fallback to local if URL fails
        });
        console.log("Updated Zustand Profile store with new avatarID, avatarUrl");

        // If there was an old avatar, delete it in the backend
        if (oldAvatarId && oldAvatarId !== newAvatarId) {
          console.log("Deleting old avatarID: ", oldAvatarId);
          imagesApi
            .remove(oldAvatarId)
            .catch((err: any) =>
              console.warn(
                "[changeAvatar] Failed to delete old avatar",
                err
              )
            );
        }
        console.log("Old Avatar deleted");
        console.log("New AvatarID: ", newAvatarId);
      }
      catch (err) {
        console.warn("[changeAvatar] Background sync failed", err);
        // TODO: retry API call logic
      }
      finally {
        setAvatarUploading(false);
      }
    })();
  } catch (err: any) {
    console.error("Error changing avatar:", err);
  } finally {
    setAvatarUploading(false);
  }
}