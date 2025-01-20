import { useEffect, useState } from "react";
import FadeLoader from "react-spinners/FadeLoader";
import Zoom from "react-medium-image-zoom";

export default function Photo({
  src,
  imageQuality  
}: {
  src: string;
    imageQuality: number 
  
}) {
  let [imageIsLoading, setImageIsLoading] = useState(true);

  const imageStyle: React.CSSProperties = {
    width: "100%",
    aspectRatio: '4 / 3',
    objectFit: "cover",
  };

  return (
    <div className="flex  justify-center">
      {imageIsLoading && <FadeLoader color="#36d7b7" className="m-3" />}
      <Zoom>
        <img
          src={`https://gadsw.dev/cdn-cgi/image/quality=${imageQuality}/${src}`}
          sizes="100vw"
          style={imageStyle}
          loading="lazy"
          className="mb-6 rounded"
          onLoad={() => {
            setImageIsLoading(false);
          }}
        />
      </Zoom>
    </div>
  );
}
