import { useSelector } from 'react-redux';
import { AssetLibraryWorkspace } from '../../components/assets/AssetLibraryWorkspace';

const AssetsLibrary = () => {
  const { user } = useSelector((state) => state.auth);
  const canManage = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  return (
    <AssetLibraryWorkspace
      title="Asset Library"
      canManage={canManage}
      portalMode={false}
    />
  );
};

export default AssetsLibrary;
