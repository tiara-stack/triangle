# Production deployment

`.github/workflows/ci.yml` checks pull requests, builds a Docker image for pushes to `main` or `master`, pushes production images to DigitalOcean Container Registry, deploys the Helm release to DigitalOcean Kubernetes, and waits for `https://triangle.theerapakg.moe/` to return HTTP 200.

The deployment reuses the cluster and registry pattern from the sibling `tiara-stack` project. Configure these GitHub Actions settings on the Triangle repository:

- **Secret** `DIGITALOCEAN_ACCESS_TOKEN`: a DigitalOcean token that can push to the registry and access the Kubernetes cluster.
- **Variable** `REGISTRY_NAME`: the DigitalOcean Container Registry name and matching namespace-local image-pull secret name.
- **Variable** `CLUSTER_NAME`: the DigitalOcean Kubernetes cluster name.
- **Variable** `K8S_NAMESPACE`: the namespace that contains the matching registry pull secret.

The target namespace must already have the registry pull secret. If it does not, create it once with the same registry name used by `tiara-stack`:

```sh
doctl registry kubernetes-manifest "$REGISTRY_NAME" \
  --namespace="$K8S_NAMESPACE" \
  --name="$REGISTRY_NAME" | kubectl apply -f -
```

The Helm chart uses the existing `ingress-nginx` class and `letsencrypt-prod` cluster issuer. It routes the hostname to the Triangle service and requests the `triangle-theerapakg-moe-tls` certificate secret.
