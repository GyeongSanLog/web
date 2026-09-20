import { createContext } from "react";

// Provider(NotificationsContext.jsx)와 훅(useNotifications.js)이 공유하는 컨텍스트 객체.
// 컴포넌트가 아닌 값을 .jsx 컴포넌트 파일에서 export하면 Vite의 Fast Refresh가
// 그 파일 전체를 통째로 다시 마운트해버려서(상태 유실) 따로 뺐다.
export const NotificationsContext = createContext(null);
