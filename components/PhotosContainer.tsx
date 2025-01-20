import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

import Photo from "./Photo";
import { getPhotos } from "@/app/api";
import ErrorComponent from "./ErrorComponent";

type Photo = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};
export default function PhotosContainer() {
  const [listOfPhotos, setListOfPhotos] = useState<Photo[]>([]);
  const [errorGettingPhotos, setErrorGettingPhotos] = useState<boolean>(false);
  const [imageQuality, setImageQuality] = useState(70);

  useEffect(() => {
    const fetchData = async () => {
      const photos = await getPhotos();
      if (photos == null) {
        setErrorGettingPhotos(true);
        return;
      }
      setListOfPhotos(photos);
    };

    fetchData();
    if (isMobile) {
      setImageQuality(45);
    }
  }, []);


  const photosArray = listOfPhotos.map((photo: Photo) => (
    <Photo src={photo.photo_url} imageQuality={imageQuality} key={photo.name} />
  ));

  return errorGettingPhotos ? (
    <ErrorComponent />
  ) : (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 ">
      {photosArray}
    </div>
  );
}
