export async function getPhotos() {
  const url: string = "https://portfolio-api.gadsw.dev/photo/get-all-photos/";
  try {
    const request = await fetch(url);
    const result = await request.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

export function getPhotoDimensions(src: string) {
  const image = new Image();
}
