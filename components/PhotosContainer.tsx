import Photo from "./Photo";

export default function PhotosContainer() {
  const photosArray = Array.from({ length: 32 }).map((_, index) => (
    <Photo isHorizontal={index % 3 == 0 || index % 5 == 0} key={index} />
  ));

  return (
    <div className="columns-1 md:columns-3 lg:columns-4 gap-5">
      {photosArray}
    </div>
  );
}
