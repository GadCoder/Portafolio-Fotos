type Photo = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};

export async function getPhotos(): Promise<Photo[]> {
  const url: string = "https://portfolio-api.gadcoder.com/photo/get-all-photos/";
  try {
    const request = await fetch(url);
    if (!request.ok) {
      console.error("HTTP error:", request.status, request.statusText);
      return [];
    }
    const result = await request.json();
    if (!Array.isArray(result)) {
      console.error("Invalid data format: expected array");
      return [];
    }
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
