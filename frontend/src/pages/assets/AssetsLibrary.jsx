import { useSelector } from 'react-redux';
import { AssetLibraryWorkspace } from '../../components/assets/AssetLibraryWorkspace';

const AssetsLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const canManage = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  return (
    <AssetLibraryWorkspace
      title="Store and manage client assets."
      description="Keep logos, brand guidelines, creative files, videos, and client documents organized in one dashboard."
      canManage={canManage}
      portalMode={false}
    />
  );
};

export default AssetsLibrary;
