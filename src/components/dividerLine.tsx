const DividerLine = ({ key = "" || Math.floor(Math.random() * 5) }) => {
  return (
    <div key={key} className="flex items-center">
      <div className="flex-1 border-t border-gray-200"></div>
    </div>
  );
};

export default DividerLine;
