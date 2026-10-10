import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * @param localUri - Local file URI (from camera or gallery)
 * @param folder - Subfolder name (e.g., 'recipes')
 * @returns Public URL of the uploaded image, or null if failed
 */
export async function uploadImage(
    localUri: string,
    folder: string = 'recipes'
): Promise<string | null> {
    try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.error('No session for image upload');
            return null;
        }

        // Check if it's already a Supabase URL (already uploaded)
        if (localUri.includes('supabase.co/storage')) {
            return localUri;
        }

        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: 'base64',
        });

        // Generate unique filename
        const fileExt = localUri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session.user.id}/${folder}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('images')
            .upload(filePath, decode(base64), {
                contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                upsert: false,
            });

        if (error) {
            console.error('Error uploading image:', error);
            return null;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error('Error in uploadImage:', error);
        return null;
    }
}

/**
 * Deletes every image the current user uploaded ({user_id}/{folder}/{file}).
 * Called before deleting the account, since SQL can't remove storage files.
 */
export async function deleteUserImages(): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const root = session.user.id;

        const { data: entries, error } = await supabase.storage.from('images').list(root);
        if (error || !entries) return;

        const paths: string[] = [];
        for (const entry of entries) {
            if (entry.id) {
                paths.push(`${root}/${entry.name}`);
                continue;
            }
            // Entries without id are subfolders (e.g. 'recipes')
            const { data: files } = await supabase.storage
                .from('images')
                .list(`${root}/${entry.name}`, { limit: 1000 });
            files?.forEach(f => paths.push(`${root}/${entry.name}/${f.name}`));
        }

        if (paths.length > 0) {
            const { error: removeError } = await supabase.storage.from('images').remove(paths);
            if (removeError) console.error('Error deleting user images:', removeError);
        }
    } catch (error) {
        console.error('Error in deleteUserImages:', error);
    }
}

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl - Public URL of the image
 * @returns true if deleted, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
    try {
        if (!imageUrl.includes('supabase.co/storage')) {
            return true; // Not a Supabase image, nothing to delete
        }

        // Extract path from URL
        const urlParts = imageUrl.split('/images/');
        if (urlParts.length < 2) return false;

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('images')
            .remove([filePath]);

        if (error) {
            console.error('Error deleting image:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteImage:', error);
        return false;
    }
}
