export async function getPhotos() {
  const url: string = "https://portfolio-api.gadcoder.com/photo/get-all-photos/";
  try {
    const request = await fetch(url);
    const result = await request.json();
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

