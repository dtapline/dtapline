output "domain_name" {
  description = "Custom domain name"
  value       = aws_apigatewayv2_domain_name.api.domain_name
}

output "api_gateway_target_domain" {
  description = "API Gateway regional domain name (target for DNS CNAME record)"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].target_domain_name
}

output "hosted_zone_id" {
  description = "API Gateway hosted zone ID (for DNS alias records)"
  value       = aws_apigatewayv2_domain_name.api.domain_name_configuration[0].hosted_zone_id
}
