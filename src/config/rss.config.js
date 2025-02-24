export const RSS_CONFIG = {
  // RSS源配置
  feeds: [
    {
      title: "V2EX",
      url: "https://www.v2ex.com/index.xml",
    },
    {
      title: "NodeSeek",
      url: "https://rss.nodeseek.com",
    },
    {
      title: "Linux DO",
      url: "https://linux.do/latest.rss",
      cookie: "__stripe_mid=dfa46cbf-5bd0-4708-85a3-d809d66abbd194aca7; fp=2596263e58bef8c37f0e476deb17dd5e; __stripe_sid=8f1b21c4-9a7e-4abf-8fbb-31876d3b718cf180d8; _t=MKyhmav%2Bk5LSyZ%2B20oEX7j1uxRUsyJZvCQAnyDBvML1Wr1NaTpX7q2owQuqsDuSvxIxXHFLWjj7BXgas8VeNx2djk0DL2lcJFkPHmfy7vIZ52wudLRaHWBtiT3IQmtURO6Ms%2BFFTaveBbrrTJJJj3%2Bidzbhf9jwmh9CqcGswZ%2Ff9bgghAAwHHUHIg3FDRfjq%2FM3Da75yoPIGE7fEoy5OtoxFTNTw3tSE4aoN0dkpLparrG830MTkuWuGRsQ2gAaExGgDBityXFnLVCg8lKxMIOXS1CvV9u%2Fupc4qUuHAaR6SnfDXOzqv5w%3D%3D--AMmpJSNMYBPJT%2FB5--R0qawBFtCUudsBcdfVZrTA%3D%3D; cf_clearance=rdeWewpZszXlpK9UlSUbvXnD3U1R6uTF5gLqFnfy18E-1740390376-1.2.1.1-aqhgh9cH3zZKvzf0SN2ep0gGGSi0j82QpUYPPuPS0Lyxtb0P1WGQYdHnea7A9qiXRTP5wJai8JCwIFd1CrN.VDInLQRADuEGzoGewhECCbsIBSFlOyv_yOkEVaARejU0K8bSvDZW15xT.kLRIIDcf1T.NyYRgUOWZrT34wnQvz0una0LabJSbxyOLhrndYxLxw3mScN01zJZmcN04PLFYDIYWy9YZBjFYDi24RVGpSxOS9apKogNhlt_4xVLagkypkaQMhX10yujfeAIPkhVmIOpAs6D_EnHvsDwOcrqgMKh9fQYFJ0TqRl7H.v_9J3rX.sOt.N7Af1B_uDMhj5iAw; _forum_session=PryMV%2FXoNHCqROWEPKZvJebgD%2BCyKYKaxf8mvDfgn2QabGHaVYFmw20HfIJpT5KGItv36LUYKXOYDf7Gn6IAlAsyv5qqE%2FQ6m3VTe9Q62UPG%2FWxZ9pOg%2BgDvX6I7J7j%2BFOzJ%2BK5AoBOoLhNWIMM7sy9rvzs29UGFnLTiJSwAXFqz4uQhIcLGMQu5uBlKwplSk7BTa%2FG4%2BHLMoXztgaATnqGYn%2FHkbCeGVrUE3Ofkp59WyO4fX74cWslIYoeVDGZ1H7JtpSnVMuDpBP6BnVXkXlElm27L6SvOoVz1b%2FYGWWQVhtCkpKW4FA%2F4C3w4x8TDHfhfI0UgfmQshI1n00E6YwJNrxYLV7%2FkNviXO6Jjy0EbMnMXHTVVRJ9Ff8Uk3w%2BxZYRPEY3MD3QnSWXvBLZdaZl%2BDT1ecDtzLBBEhPiYdeav0DApWODBLIEKZgylTqhtdjZgVtHedsZiv9JJOgbtc0o5rHJLEF4U7PrVq6%2FUAbR%2BUlpF5yBpa4rbjz3dWkC1aIaKei3q--ZbxMBXqJgowGy3t5--UFdNGSKNmZWZXiXPlRxpnw%3D%3D", // 添加 cookie 配置
    },
  ],
  // 刷新配置
  refresh: {
    interval: 30, // 降低到30秒以提高响应性
    cache: 0, // 禁用缓存
  },
  // 显示配置
  display: {
    itemsPerFeed: 10, // 每个源显示的条目数
    dateFormat: "yyyy-MM-dd HH:mm", // 日期格式
  },
};
