declare module "@react-native-camera-roll/camera-roll" {
  interface PhotoIdentifierImage {
    uri: string;
    filename: string | null;
    height: number;
    width: number;
    fileSize: number | null;
    playableDuration: number;
    filepath: string | null;
    extension: string | null;
    orientation: number | null;
  }

  interface PhotoIdentifierNode {
    id: string;
    type: string;
    group_name: string[];
    image: PhotoIdentifierImage;
    timestamp: number;
    location: { latitude: number; longitude: number } | null;
  }

  interface PhotoIdentifier {
    node: PhotoIdentifierNode;
  }

  interface PhotoIdentifiersPage {
    edges: PhotoIdentifier[];
    page_info: {
      has_next_page: boolean;
      start_cursor?: string;
      end_cursor?: string;
    };
  }

  interface GetPhotosParams {
    first: number;
    after?: string;
    assetType?: "All" | "Photos" | "Videos";
    include?: Array<"filename" | "fileSize" | "fileExtension" | "location" | "imageSize" | "playableDuration" | "orientation">;
    groupTypes?: string;
    groupName?: string;
  }

  export const CameraRoll: {
    getPhotos(params: GetPhotosParams): Promise<PhotoIdentifiersPage>;
  };
}
