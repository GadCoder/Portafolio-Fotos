import { useEffect, useState } from "react";
import FadeLoader from "react-spinners/FadeLoader";
import Zoom from "react-medium-image-zoom";

export default function Photo({
  src,
  isMobile,
}: {
  src: string;
  isMobile: boolean;
}) {
  const [imageQuality, setImageQuality] = useState(80);
  let [imageIsLoading, setImageIsLoading] = useState(true);
  useEffect(() => {
    if (isMobile) {
      setImageQuality(50);
    }
  }, []);

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "auto",
    objectFit: "cover",
  };
  return (
    <div className="flex  justify-center">
      {imageIsLoading && (
        <FadeLoader
          color="#36d7b7"
          className="m-3"
          style={{ width: 120, height: 120 }}
        />
      )}
      <Zoom>
        <img
          src={`https://gadsw.dev/cdn-cgi/image/quality=${imageQuality}/${src}`}
          width={0}
          height={0}
          sizes="100vw"
          style={{
            ...imageStyle,
            display: imageIsLoading ? "none" : "block",
          }}
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
