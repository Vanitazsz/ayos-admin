// Logic keeps actions lean so they can be shared by the controller.
export {
  loadProofOfWork,
  resolveProofMedia,
  hasWorkerProof,
  hasCustomerProof,
} from '../../../services/proofOfWork';
export { subscribe } from '../../../services/realtime';
