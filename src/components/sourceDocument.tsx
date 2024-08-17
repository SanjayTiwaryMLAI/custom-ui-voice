import { IconInfoSquareRounded, IconSquareRoundedX } from "@tabler/icons-react";
import { memo, useState } from "react";

interface Props {
  sourceDocumentsData: any[];
}

export const SourceDocumentModal = memo(({ sourceDocumentsData }: Props) => {
  const [docSourceModalVisible, setDocSourceModalVisible] =
    useState<boolean>(false);

  const onModalDismiss = () => setDocSourceModalVisible(false);
  return (
    <div>
      <button
        id="source-docs-button"
        type="button"
        onClick={() => setDocSourceModalVisible(true)}
      >
        <IconInfoSquareRounded size={18} />
      </button>
      {docSourceModalVisible ? (
        <>
          <div className="not-prose justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
            <div className="relative w-auto my-6 mx-auto max-w-xl">
              <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
                <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                  <span className="text-2xl font-semibold">
                    Source Documents ({sourceDocumentsData.length})
                  </span>
                  <button
                    className="p-1 ml-auto"
                    onClick={() => onModalDismiss()}
                  >
                    <IconSquareRoundedX></IconSquareRoundedX>
                  </button>
                </div>
                <div className="relative p-3 flex-auto overflow-y-auto max-h-64S">
                  {sourceDocumentsData.map((sourceDoc: any, _index: any) => {
                    return (
                      <div
                        id={`${_index}` + "_document"}
                        key={`${_index}` + "_document"}
                        className="rounded shadow-lg"
                      >
                        <div className="px-6 py-4">
                          <div className="font-semibold text-sm mb-2">
                            {sourceDoc.title}
                          </div>
                          <a
                            className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600 text-xs"
                            href={sourceDoc.source}
                            target="_blank"
                          >
                            {sourceDoc.source}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="opacity-25 fixed inset-0 z-40 bg-black"></div>
        </>
      ) : null}
    </div>
  );
});
