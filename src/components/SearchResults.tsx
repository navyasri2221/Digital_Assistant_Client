/**
 * Author: Lakshman Veti
 * Type: Component
 * Objective: To render search results
 * Associated Route/Usage: *
 */

import React, {useEffect, useState} from "react";
import {Button, Empty, List} from "antd";
import {DoubleRightOutlined, PlayCircleOutlined, EyeOutlined} from "@ant-design/icons";
import { setToStore } from "../util";
import InfiniteScroll from "react-infinite-scroller";
import {CONFIG} from "../config";
import {getRowObject} from "../util/getRowObject";
import {recordUserClickData} from "../services";
import ReactGA from "react-ga4";
import {getRecordingName} from "../util/getRecordingName";

export interface MProps {
  visibility?: boolean;
  data?: any;
  searchKeyword?: string;
  showDetails?: Function;
  addRecordHandler?: Function;
  searchHandler?: Function;
  page?: number;
  config?: any;
  playHandler?: Function;
  hasMorePages?: boolean;
}

let globalSearchResults: any = [];
/**
 * To render search result elements
 * @returns HTML Elements
 */

export const SearchResults = (props: MProps) => {
  const [searchResults, setSearchResults] = useState<any>([]);
  const [fetchingInProgress, setFetchingInProgress] = useState<boolean>(false);
  const [enableScroll, setEnableScroll] = useState<boolean>(false);

  useEffect(() => {
    // Send pageview with a custom path
    ReactGA.send({ hitType: "pageview", page: "/search", title: "Search page loaded" });
  }, []);

  useEffect(() => {
    if (props?.searchKeyword) globalSearchResults = [];
    globalSearchResults = [...globalSearchResults, ...props?.data];
    setSearchResults([...globalSearchResults]);
  }, [props?.data]);

  useEffect(() => {
    if (props.hasMorePages)
      setEnableScroll(true);
    else
      setEnableScroll(false);
  }, [props]);

  const selectItem = async (item: any, play=false) => {
    setToStore(item, CONFIG.SELECTED_RECORDING, false);
    if (props?.showDetails){
      props.showDetails(item);
      await recordUserClickData('viewRecording', getRecordingName(item), item.id);
    }

    if(play){
      props.playHandler("on");
      await recordUserClickData('play', getRecordingName(item), item.id);
    }
  };

  const loadSearchResults = async () => {
    if (props.hasMorePages && props?.searchHandler && !fetchingInProgress) {
      setEnableScroll(false);
      setFetchingInProgress(true);
      await props.searchHandler(((props.page===0)?1:props.page+1), true, true);
      setFetchingInProgress(false);
    }
  };

  const renderData = () => {
    if (!props?.visibility) return <></>;
    return !props?.visibility ? null : !props?.data?.length ? (
      <Empty description={"No results found"} />
    ) : (
      <List
        itemLayout="horizontal"
        dataSource={props?.data}
        renderItem={(item) => (
          <List.Item className="uda_exclude" actions={[
            <Button shape="circle" icon={<PlayCircleOutlined className="secondary" />} onClick={() => selectItem(item, true)}></Button>,
            <Button shape="round" icon={<EyeOutlined className="secondary" />} onClick={() => selectItem(item)}>
              View
            </Button>]}>
            <List.Item.Meta
              title={getRowObject(item)?.sequenceName}
              description={getRowObject(item)?.path}
            />
          </List.Item>
        )}
      />
    );
  };


  // return renderData();
  return (
    <>
      {!searchResults?.length && (
        <div className="uda-no-results">
          <Empty description={"No results found"} />
        </div>
      )}
      {searchResults?.length > 0 && (
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          threshold={250}
          loadMore={loadSearchResults}
          hasMore={enableScroll}
          useWindow={false}
        >
          {renderData()}
        </InfiniteScroll>
      )}
    </>
  );
};
