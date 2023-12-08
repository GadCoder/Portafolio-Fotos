export default async function getPhotos() {
  const url: string = "http://159.112.132.79:8000/get-all-photos/";
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
