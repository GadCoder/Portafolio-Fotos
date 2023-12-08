import { useEffect, useState } from "react";
import Photo from "./Photo";
import getPhotos from "@/app/api";

type Photo = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};
export default function PhotosContainer() {
  const [listOfPhotos, setListOfPhotos] = useState<Photo[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      const photos = await getPhotos();
      if (photos != null) {
        setListOfPhotos(photos);
      }
    };

    fetchData();
  }, []);

  const photosArray = listOfPhotos.map((photo: Photo) => (
    <Photo
      isHorizontal={photo.is_horizontal}
      src={photo.photo_url}
      name={photo.name}
      key={photo.name}
    />
  ));

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 ">
      {photosArray}
    </div>
  );
}
