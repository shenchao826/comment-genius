
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="text-8xl">🔍</div>
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-slate-300">抱歉，您访问的页面不存在</p>
        <p className="text-slate-500">可能是链接已失效，或者您输入了错误的地址</p>
        <div className="flex gap-4 justify-center">
          <Link to="/">
            <Button>返回首页</Button>
          </Link>
          <Link to="/history">
            <Button variant="secondary">查看历史记录</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
