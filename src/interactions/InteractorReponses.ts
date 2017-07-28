export 
interface InteractionResponses<T, D = any> {
    status: T;
    message: string;
    data?: D;
    type: 'success' | 'failure';
}
