import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as path from 'path'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

const BOT_TOKEN = '5997326822:AAFWRjoBXR96Y5QC5QHzPlWIIaGQG-gY1f8'
export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const telegramBotHandler = new NodejsFunction(this, 'telegramBotHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'main',
      entry: path.join(__dirname, `/../../src/lambda/index.ts`),
      environment: {
        CURRENT_ENV: 'dev',
        BOT_TOKEN: BOT_TOKEN,
      },
    })

    const restApi = new apigateway.RestApi(this, 'telegrambot-api', {
      deploy: false,
      defaultCorsPreflightOptions: {
        // Enable CORS policy to allow from any origin. Customize as needed.
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: false,
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    })

    restApi.root
      .addResource('bot')
      .addMethod(
        'GET',
        new apigateway.LambdaIntegration(telegramBotHandler, { proxy: true })
      )

    // Lets add nested resource under /bot resource path and attach a POST method with same Lambda integration.
    restApi.root
      .getResource('bot')
      ?.addResource('webhook')
      .addMethod(
        'POST',
        new apigateway.LambdaIntegration(telegramBotHandler, { proxy: true })
      )

    // All constructs take these same three arguments : scope, id/name, props
    const devDeploy = new apigateway.Deployment(this, 'dev-deployment', {
      api: restApi,
    })

    // All constructs take these same three arguments : scope, id/name, props
    const devStage = new apigateway.Stage(this, 'devStage', {
      deployment: devDeploy,
      stageName: 'dev', // If not passed, by default it will be 'prod'
    })

    // console.log("Check inner properties of API Stage", devStage);

    // All constructs take these same three arguments : scope, id/name, props
    new cdk.CfnOutput(this, 'BotURL', {
      value: `https://${restApi.restApiId}.execute-api.${this.region}.amazonaws.com/dev/bot`,
    })

    new cdk.CfnOutput(this, 'BotWebhookUrl', {
      value: `https://${restApi.restApiId}.execute-api.${this.region}.amazonaws.com/dev/bot/webhook`,
    })

    new cdk.CfnOutput(this, 'Lambda Cloudwatch Log URL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${telegramBotHandler.functionName}`,
    })
  }
}
